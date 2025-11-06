/**
 * Serviço de Jogador - Gerenciamento de Movimento e Estado
 * 
 * Este serviço é responsável por toda a lógica relacionada aos jogadores:
 * - Sistema de movimento tile-by-tile baseado em velocidade
 * - Gerenciamento de viewport (tiles visíveis ao redor do jogador)
 * - Sincronização de posição com outros jogadores (snapshots)
 * - Persistência de posição no banco de dados
 * 
 * Sistema de movimento:
 * - Baseado em velocidade configurável (ms/tile)
 * - Usa acumulador de tempo + delta para movimento suave
 * - Valida bordas do mapa antes de mover
 * - Não permite transição entre mapas (bordas bloqueiam)
 * 
 * Sistema de rede:
 * - Viewport: enviado quando jogador muda região (coalescido)
 * - Snapshots: enviados periodicamente para outros jogadores
 * - Rate limiting: respeita taxas configuráveis (MAP_MAX_HZ, SNAPSHOT_MAX_HZ)
 */

import { savePlayerPosition } from '../models/Player.js';
import { savePlayerState } from '../models/PlayerState.js';
import { sendMapObjectSpawnsToPlayer, sendMapObjectPlacementsToPlayer } from './mapObjectsLoader.js';
import { isDeepWater, isWalkable, getModifiedSpeed, DEFAULT_PLAYER_SPEED } from '../constants/tiles.js';
import { compressLZW } from '../utils/compression.js';

export class PlayerService {
  /**
   * Construtor - Inicializa o serviço de jogadores
   * 
   * @param {Object} env - Configurações do ambiente
   * @param {Object} logger - Logger
   * @param {Object} world - Instância do World
   */
  constructor(env, logger, world) {
    this.env = env;
    this.logger = logger;
    this.world = world;

    // Intervalo mínimo entre envios de snapshot (ms)
    // Ex: 20 Hz = 1000/20 = 50ms mínimo entre snapshots
    this._snapshotMinInterval = 1000 / Number(env.SNAPSHOT_MAX_HZ || 20);
    
    // Intervalo mínimo entre envios de mapa (ms)
    // Ex: 20 Hz = 1000/20 = 50ms mínimo entre mapas
    this._mapMinInterval = 1000 / Number(env.MAP_MAX_HZ || 20);
  }

  /**
   * Cria pacote de template do jogador
   * 
   * O template define a aparência visual do jogador e é enviado
   * uma vez quando jogadores se encontram pela primeira vez.
   * 
   * @param {Object} player - Jogador
   * @returns {Object} Pacote plr_tpl com aparência do jogador
   * 
   * Campos do pacote:
   * - id: ID da sessão (único)
   * - n: nome do jogador
   * - l: nível
   * - p: cor do nome
   * - pr: dias de premium
   * - s: sprite (>= 0 = monstro, -1 = humano)
   * - b, h, c: body, hair, clothes (índices de sprite)
   * - hc, cc, ec: hair color, clothes color, eye color (RGB decimal)
   */
  makePlayerTemplatePacket(player) {
    return {
      type: 'plr_tpl',
      id: Number(player.sessionId),
      n: player.name,
      t: '',  // Título (vazio por padrão)
      l: player.level,
      p: player.appearance.nameColor,    // Cor do nome
      pr: player.premium || 0,           // Dias de premium
      s: player.appearance.sprite,       // -1 = humano, >= 0 = monstro
      b: player.appearance.body,         // Sprite do corpo
      h: player.appearance.hair,         // Sprite do cabelo
      hc: player.appearance.hairColor,   // Cor do cabelo
      c: player.appearance.clothes,      // Sprite da roupa
      cc: player.appearance.clothesColor,// Cor da roupa
      ec: player.appearance.eyeColor     // Cor dos olhos
    };
  }

  /**
   * Cria pacote de snapshot do jogador
   * 
   * O snapshot define posição e estado atual do jogador.
   * É enviado periodicamente para manter outros jogadores
   * sincronizados com movimentos e mudanças de direção.
   * 
   * @param {Object} player - Jogador
   * @returns {Object} Pacote 'p' com estado atual
   * 
   * Campos do pacote:
   * - id: ID da sessão
   * - tpl: ID do template (mesmo que id)
   * - x, y: posição atual
   * - dx: coordenada x de destino (próximo tile se movendo, senão igual a x)
   * - dy: coordenada y de destino (próximo tile se movendo, senão igual a y)
   * - s: velocidade (ms/tile)
   * - d: direção (0=cima, 1=direita, 2=baixo, 3=esquerda)
   * - ch: channel/camada (0 = padrão)
   */
  makePlayerSnapshotPacket(player) {
    // Calcula destino baseado na direção e se está movendo
    // Direção: 0=cima, 1=direita, 2=baixo, 3=esquerda
    let dx = player.x;
    let dy = player.y;
    
    if (player.moving) {
      // Se o jogador está se movendo, dx/dy devem apontar para o próximo tile
      const dirX = (player.dir === 1 ? 1 : player.dir === 3 ? -1 : 0);
      const dirY = (player.dir === 2 ? 1 : player.dir === 0 ? -1 : 0);
      dx = player.x + dirX;
      dy = player.y + dirY;
    }
    
    return {
      type: 'p',
      id: Number(player.sessionId),
      tpl: Number(player.sessionId),
      x: player.x,
      y: player.y,
      dx: dx,  // Destino X (próximo tile se movendo)
      dy: dy,  // Destino Y (próximo tile se movendo)
      s: player.speed || 300,
      d: player.dir || 0,
      ch: 0  // Channel (não usado, sempre 0)
    };
  }

  /**
   * Cria array de snapshots serializados para pacote "pl"
   * 
   * Helper method que converte uma lista de jogadores em um array
   * de strings JSON contendo seus snapshots, no formato esperado
   * pelo campo "data" do pacote "pl".
   * 
   * @param {Array<Object>} players - Lista de jogadores
   * @returns {Array<string>} Array de snapshots serializados
   */
  makePlayerListData(players) {
    return players.map(p => {
      const snapshot = this.makePlayerSnapshotPacket(p);
      return JSON.stringify(snapshot);
    });
  }

  /**
   * Calcula origem do viewport para um jogador centralizado na posição do player
   * 
   * O viewport é a área retangular de tiles visíveis ao redor do jogador.
   * A origem (ox, oy) é o canto superior esquerdo desta área.
   * 
   * Sistema Centralizado:
   * - O viewport está sempre centralizado no jogador
   * - A origem é calculada como player.x - raio_x, player.y - raio_y
   * - Viewport é enviado quando o jogador se move o suficiente (coalescência)
   * - Isso garante que o jogador sempre vê o conteúdo ao seu redor imediatamente
   * 
   * @param {Object} player - Jogador
   * @returns {Object} { ox, oy } - Origem do viewport centralizada no player
   * 
   * Exemplo com raio 18x13 (viewport 36x26):
   * - Viewport total: 36x26 tiles (2*raio)
   * - Se player está em (50, 50):
   *   - ox = 50 - 18 = 32
   *   - oy = 50 - 13 = 37
   * - Viewport vai de (32, 37) até (68, 63)
   * - Player está no centro em (50, 50)
   */
  /**
   * Calcula limites máximos da origem do viewport
   * 
   * A origem do viewport é o canto superior esquerdo da área visível.
   * Este método calcula qual é a posição máxima que essa origem pode ter
   * antes do viewport ultrapassar os limites do mapa.
   * 
   * Por exemplo, em um mapa 50x50 com viewport de 36x26 (raio 18x13):
   * - maxOX = 50 - 36 = 14 (origem X máxima)
   * - maxOY = 50 - 26 = 24 (origem Y máxima)
   * 
   * Isso garante que o viewport sempre fique dentro dos limites do mapa.
   * 
   * @param {Object} map - Mapa atual
   * @returns {Object} { maxOX, maxOY } - Limites máximos da origem
   * @private
   */
  _getMaxViewportOrigin(map) {
    const radiusX = this.env.MAP_VIEW_RADIUS_X;
    const radiusY = this.env.MAP_VIEW_RADIUS_Y;
    return {
      maxOX: Math.max(0, map.width - (2 * radiusX)),
      maxOY: Math.max(0, map.height - (2 * radiusY))
    };
  }

  getViewportOrigin(player) {
    const radiusX = this.env.MAP_VIEW_RADIUS_X;
    const radiusY = this.env.MAP_VIEW_RADIUS_Y;

    // Calcula origem centralizada no jogador
    let ox = player.x - radiusX;
    let oy = player.y - radiusY;

    // Corrige para não ultrapassar borda do mapa
    const map = this.world.mapService.getMap(player.mapId);
    if (map) {
      // Limita origem ao início do mapa
      ox = Math.max(0, ox);
      oy = Math.max(0, oy);
      
      // Limita origem para não ultrapassar o fim do mapa
      const { maxOX, maxOY } = this._getMaxViewportOrigin(map);
      ox = Math.min(ox, maxOX);
      oy = Math.min(oy, maxOY);
    }

    return { ox, oy };
  }

  /**
   * Marca viewport como "sujo" (precisa ser enviado)
   * 
   * Chamado quando o jogador se move para uma nova região.
   * Não envia imediatamente - apenas marca para envio no próximo flush.
   * 
   * @param {Object} player - Jogador
   * 
   * O viewport é marcado quando:
   * - O jogador se moveu além do limite de chunk (CHUNK_THRESHOLD)
   * - É o primeiro viewport (valores undefined)
   * 
   * Isso garante que:
   * - O viewport NÃO é enviado a cada passo do jogador (otimização de chunk)
   * - O viewport é atualizado apenas quando o jogador se afasta suficiente do último centro
   * - Isso reduz drasticamente o tráfego de rede
   * 
   * Sistema de chunks baseado em coordenadas:
   * - Define um limite de distância (CHUNK_THRESHOLD = 4 tiles)
   * - Viewport só é reenviado quando o jogador se move mais de 4 tiles do último centro
   * - Isso significa viewport é enviado aproximadamente a cada 4 passos em linha reta
   * - Múltiplas mudanças no mesmo tick resultam em apenas um envio
   */
  markViewportDirty(player) {
    // Define o limite de chunk (quantos tiles o jogador pode se mover antes de reenviar viewport)
    // Com threshold de 4, viewport é enviado a cada ~4 passos
    const CHUNK_THRESHOLD = 4;
    
    // Se é o primeiro viewport (valores undefined), marca como dirty
    if (player._lastViewPlayerX === undefined || player._lastViewPlayerY === undefined) {
      player._viewDirty = true;
      const { ox, oy } = this.getViewportOrigin(player);
      player._pendingOX = ox;
      player._pendingOY = oy;
      return;
    }
    
    // Calcula distância desde o último envio de viewport
    const dx = Math.abs(player.x - player._lastViewPlayerX);
    const dy = Math.abs(player.y - player._lastViewPlayerY);
    
    // Marca como dirty se o jogador se moveu além do limite de chunk
    // Usa condição OR (dx >= threshold OU dy >= threshold) para detectar movimento significativo
    // Isso cria uma região de tolerância onde viewport não é reenviado
    if (dx >= CHUNK_THRESHOLD || dy >= CHUNK_THRESHOLD) {
      player._viewDirty = true;
      const { ox, oy } = this.getViewportOrigin(player);
      player._pendingOX = ox;
      player._pendingOY = oy;
    }
  }

  /**
   * Envia viewport se marcado como sujo e rate limit permite
   * 
   * @param {Object} player - Jogador
   * @param {number} now - Timestamp atual (ms)
   * 
   * Proteções:
   * - Só envia se _viewDirty === true
   * - Respeita rate limit (_mapMinInterval)
   * - Coalescência: múltiplas mudanças = um envio
   * 
   * O que é enviado:
   * 1. Pacote 'map' com todos os tiles visíveis
   * 2. Objetos animados presentes no mapa
   */
  flushViewportIfDirty(player, now) {
    // Não faz nada se viewport não mudou
    if (!player._viewDirty) return;
    
    // Rate limiting: respeita intervalo mínimo entre envios
    if (now - (player._lastMapAt || 0) < this._mapMinInterval) return;

    // Limpa flag e atualiza origem guardada
    player._viewDirty = false;
    player._lastViewOX = player._pendingOX;
    player._lastViewOY = player._pendingOY;
    player._lastMapAt = now;
    
    // Guarda a posição do jogador quando o viewport foi enviado
    // Isso permite que markViewportDirty() detecte quando o jogador se moveu além do limite de chunk
    player._lastViewPlayerX = player.x;
    player._lastViewPlayerY = player.y;

    // Obtém o mapa atual
    const map = this.world.mapService.getMap(player.mapId);
    if (!map) return;
    
    // Constrói payload com tiles visíveis (sem compressão LZW)
    const tiles = this.world.mapService.buildViewportPayload(
      map,
      player.x,
      player.y,
      this.env.MAP_VIEW_RADIUS_X,
      this.env.MAP_VIEW_RADIUS_Y,
      false  // Desabilita compressão LZW - tiles devem ficar no formato normal
    );
    
    // === VALIDAÇÃO DE CHUNK ===
    // Valida o chunk antes de enviar
    const validation = this.world.chunkValidationService.validateChunk(
      player,
      map,
      player._lastViewOX,
      player._lastViewOY,
      this.env.MAP_VIEW_RADIUS_X,
      this.env.MAP_VIEW_RADIUS_Y,
      tiles
    );

    if (!validation.valid) {
      // Chunk inválido - não envia e loga erro
      this.logger.error(
        { sessionId: player.sessionId, reason: validation.reason },
        'Chunk inválido bloqueado'
      );
      return;
    }

    // Note: Duplicate chunk detection removed per user request
    // Always send chunks even if they are duplicates to prevent desynchronization issues

    // === COMPRESSÃO E ENCAPSULAMENTO DO MAPA ===
    // Estrutura: PKG → ZIP → MAP (conforme protocolo original do cliente)
    // O cliente espera receber um pacote PKG contendo um pacote ZIP com dados 
    // comprimidos usando LZW que ao serem descomprimidos com jv.unzip() revelam o pacote MAP
    
    // 1. Cria pacote MAP com os dados do mapa
    const mapPacket = { type: 'map', x: player.x, y: player.y, tiles };
    const mapJson = JSON.stringify(mapPacket);
    
    // 2. Comprime o MAP JSON usando LZW (compatível com jv.unzip do cliente)
    const compressedMap = compressLZW(mapJson);
    
    // 3. Cria pacote ZIP com os dados comprimidos em LZW
    const zipPacket = { type: 'zip', data: compressedMap };
    
    // 4. Empacota o ZIP dentro de um PKG (seguindo o padrão do protocolo)
    const pkgData = [JSON.stringify(zipPacket)];
    const pkg = {
      type: 'pkg',
      data: JSON.stringify(pkgData)
    };
    
    // Envia o pacote PKG contendo o ZIP para o jogador
    this.world.sendTo(player, pkg);

    // Envia objetos animados presentes neste mapa
    sendMapObjectSpawnsToPlayer(player, map, this.world);
    
    // Envia objetos estáticos (placements de templates) presentes neste mapa
    sendMapObjectPlacementsToPlayer(player, map, this.world);
  }

  /**
   * Marca snapshot como "sujo" (precisa ser enviado)
   * 
   * Chamado quando posição ou estado do jogador muda.
   * Outros jogadores precisam receber atualização.
   * 
   * @param {Object} player - Jogador
   */
  markSnapshotDirty(player) {
    player._snapshotDirty = true;
  }

  /**
   * Envia snapshot se marcado como sujo e rate limit permite
   * 
   * @param {Object} player - Jogador
   * @param {number} now - Timestamp atual (ms)
   * @param {boolean} immediate - Se true, ignora rate limit e envia imediatamente
   * 
   * Marca o jogador para ser incluído no próximo batch de snapshots.
   * Os snapshots são enviados em formato "pl" (player list) em vez de
   * pacotes "p" individuais para otimizar a rede.
   * 
   * O parâmetro 'immediate' é usado quando precisamos garantir
   * sincronização imediata, como após correção de posição.
   */
  flushSnapshotIfDirty(player, now, immediate = false) {
    // Não faz nada se snapshot não mudou
    if (!player._snapshotDirty) return;
    
    // Rate limiting: respeita intervalo mínimo entre snapshots (a menos que seja imediato)
    if (!immediate && now - (player._lastSnapshotAt || 0) < this._snapshotMinInterval) return;

    // Marca jogador para ser incluído no próximo batch de snapshots
    player._pendingSnapshot = true;
    
    // Atualiza timestamp e limpa flag
    player._lastSnapshotAt = now;
    player._snapshotDirty = false;
  }

  /**
   * Envia snapshot de correção imediata ao jogador
   * 
   * Chamado quando movimento é bloqueado para garantir que o cliente
   * receba imediatamente as coordenadas corretas (dx=x, dy=y) e evite
   * bugs visuais de dessincronia.
   * 
   * @param {Object} player - Jogador que teve movimento bloqueado
   * @private
   */
  _sendImmediateCorrection(player) {
    const correctionSnapshot = this.makePlayerSnapshotPacket(player);
    this.world.sendTo(player, correctionSnapshot);
  }

  /**
   * Tick de atualização do jogador
   * 
   * Chamado pelo game loop a cada TICK_MS (padrão 50ms).
   * Processa movimento do jogador e envia atualizações de rede.
   * 
   * @param {Object} player - Jogador a atualizar
   * @param {number} dt - Delta time (tempo desde último tick em ms)
   * 
   * Fluxo de processamento:
   * 1. Flush pendências do tick anterior (viewport, snapshot)
   * 2. Se não está se movendo, retorna
   * 3. Acumula delta time
   * 4. Processa múltiplos passos se acumulou tempo suficiente
   * 5. Para cada passo: valida movimento e atualiza posição
   * 6. Marca viewport/snapshot como sujos se moveu
   * 7. Flush novamente para enviar atualizações
   * 
   * Sistema de movimento:
   * - Baseado em acumulador de tempo (_accumMs)
   * - Cada passo consome player.speed ms (ex: 750ms)
   * - Se acumulou 1500ms e speed é 750ms, processa 2 passos
   * - Bordas do mapa bloqueiam movimento (não permite sair)
   */
  tickPlayer(player, dt) {
    const now = Date.now();

    // === PASSO 1: Flush pendências do tick anterior ===
    // Envia viewport e snapshots que foram marcados como sujos
    this.flushViewportIfDirty(player, now);
    this.flushSnapshotIfDirty(player, now);

    // Se não está se movendo, não há mais nada a fazer
    if (!player.moving) return;

    // === PASSO 2: Acumula tempo e processa movimento ===
    // Adiciona delta time ao acumulador
    player._accumMs = (player._accumMs || 0) + dt;
    
    // Tempo necessário para um passo (mínimo 20ms para evitar problemas)
    const stepMs = Math.max(20, player.speed || DEFAULT_PLAYER_SPEED);

    // Flag para saber se houve movimento neste tick
    let moved = false;
    
    // Processa apenas UM passo por tick para evitar que o jogador pule múltiplas coordenadas
    // Isso garante movimento sequencial tile-by-tile (A -> B -> C, não A -> C)
    // Cap o acumulador para no máximo 2x stepMs para evitar acúmulo excessivo
    player._accumMs = Math.min(player._accumMs, stepMs * 2);
    
    if (player._accumMs >= stepMs) {
      const map = this.world.mapService.getMap(player.mapId);
      if (!map) return; // Mapa não existe, para processamento deste tick
      
      // === PROCESSAMENTO DE MOVIMENTO ===

      // === SALVA POSIÇÃO VÁLIDA ATUAL ===
      // Guarda a última posição válida antes de tentar mover
      // Se o movimento for bloqueado, o jogador voltará para esta posição
      const lastValidX = player.x;
      const lastValidY = player.y;

      // === CÁLCULO DA PRÓXIMA POSIÇÃO ===
      // Direção: 0=cima, 1=direita, 2=baixo, 3=esquerda
      const dx = (player.dir === 1 ? 1 : player.dir === 3 ? -1 : 0);
      const dy = (player.dir === 2 ? 1 : player.dir === 0 ? -1 : 0);
      const nx = player.x + dx;  // Próxima posição X
      const ny = player.y + dy;  // Próxima posição Y

      // === VALIDAÇÃO DE SEGURANÇA ===
      // Valida movimento usando o serviço de segurança
      const validation = this.world.securityService.validateMovement(player, nx, ny, player.dir);
      if (!validation.valid) {
        // Movimento inválido - bloqueia e loga
        this.logger.warn(
          { sessionId: player.sessionId, reason: validation.reason, from: {x: player.x, y: player.y}, to: {x: nx, y: ny} },
          'Movimento bloqueado por validação de segurança'
        );
        // Para o movimento do jogador
        this.stopMoving(player);
      } else {
        // Consome o tempo deste passo do acumulador
        player._accumMs -= stepMs;

        // === VALIDAÇÃO DE BORDAS ===
        // Bordas do mapa são INACESSÍVEIS nesta implementação
        // Se tentar sair do mapa, retorna para última posição válida
        if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) {
          // Retorna para a última posição válida
          player.x = lastValidX;
          player.y = lastValidY;
          
          // Para o movimento do jogador
          this.stopMoving(player);
          
          // Marca viewport e snapshot como sujos para enviar atualização
          this.markViewportDirty(player);
          this.markSnapshotDirty(player);
          
          // === CORREÇÃO IMEDIATA ===
          // Envia snapshot corrigido imediatamente ao próprio player
          // para garantir que o cliente veja a posição correta (dx=x, dy=y)
          // e evitar bugs visuais de dessincronia
          this._sendImmediateCorrection(player);
          
          this.logger.debug(
            { sessionId: player.sessionId, lastValid: {x: lastValidX, y: lastValidY}, attempted: {x: nx, y: ny} },
            'Player returned to last valid position (map border)'
          );
        } else {
          // === VALIDAÇÃO DE TILE (DEEP WATER) ===
          // Deep water tiles (215, 248, 325) are blocked by default
          // Unless player has canSwim capability (future feature)
          // Now supports both numeric tiles (215) and variant notation ("215_1")
          const tileAtTarget = map.tiles[ny]?.[nx];
          
          let movementBlocked = false;
          
          // Check if tile exists (not undefined/null due to out-of-bounds or missing data)
          if (tileAtTarget !== undefined && tileAtTarget !== null && isDeepWater(tileAtTarget)) {
            // Check if player can swim (future: player.canSwim)
            const canSwim = player.canSwim || false;
            if (!canSwim) {
              // Movement blocked by deep water - return to last valid position
              player.x = lastValidX;
              player.y = lastValidY;
              
              // Para o movimento do jogador
              this.stopMoving(player);
              
              // Marca viewport e snapshot como sujos para enviar atualização
              this.markViewportDirty(player);
              this.markSnapshotDirty(player);
              
              // === CORREÇÃO IMEDIATA ===
              // Envia snapshot corrigido imediatamente ao próprio player
              // para garantir que o cliente veja a posição correta (dx=x, dy=y)
              // e evitar bugs visuais de dessincronia
              this._sendImmediateCorrection(player);
              
              this.logger.debug(
                { sessionId: player.sessionId, lastValid: {x: lastValidX, y: lastValidY}, attempted: {x: nx, y: ny}, tile: tileAtTarget },
                'Player returned to last valid position (deep water)'
              );
              movementBlocked = true;
            }
          }
          
          // === VALIDAÇÃO DE TILE (WALKABILITY) ===
          // Check if tile is walkable (not in NON_WALKABLE_TILES set)
          // Now supports both numeric tiles (209) and variant notation ("209_2")
          // Only validate if tile exists (skip undefined/null which would indicate data issues)
          if (!movementBlocked && tileAtTarget !== undefined && tileAtTarget !== null && !isWalkable(tileAtTarget)) {
            // Movement blocked by non-walkable tile - return to last valid position
            player.x = lastValidX;
            player.y = lastValidY;
            
            // Para o movimento do jogador
            this.stopMoving(player);
            
            // Marca viewport e snapshot como sujos para enviar atualização
            this.markViewportDirty(player);
            this.markSnapshotDirty(player);
            
            // === CORREÇÃO IMEDIATA ===
            // Envia snapshot corrigido imediatamente ao próprio player
            // para garantir que o cliente veja a posição correta (dx=x, dy=y)
            // e evitar bugs visuais de dessincronia
            this._sendImmediateCorrection(player);
            
            this.logger.debug(
              { sessionId: player.sessionId, lastValid: {x: lastValidX, y: lastValidY}, attempted: {x: nx, y: ny}, tile: tileAtTarget },
              'Player returned to last valid position (non-walkable tile)'
            );
            movementBlocked = true;
          }

          // === MOVIMENTO VÁLIDO ===
          // Se não foi bloqueado, aplica movimento
          if (!movementBlocked) {
            // Passo está dentro do mapa, aplica movimento
            player.x = nx;
            player.y = ny;
            
            // === APLICAR SPEED MODIFIER DO TILE ===
            // Apply speed modifier based on the tile the player is now standing on
            // This affects the next movement step
            const currentTile = map.tiles[player.y]?.[player.x];
            if (Number.isFinite(currentTile)) {
              const modifiedSpeed = getModifiedSpeed(player.baseSpeed || DEFAULT_PLAYER_SPEED, currentTile);
              // Store both base speed and current modified speed
              if (!player.baseSpeed) {
                player.baseSpeed = player.speed || DEFAULT_PLAYER_SPEED;
              }
              player.speed = modifiedSpeed;
              
              // Log if speed was modified (for debugging)
              if (modifiedSpeed !== player.baseSpeed) {
                this.logger.debug(
                  { 
                    sessionId: player.sessionId, 
                    tile: currentTile, 
                    baseSpeed: player.baseSpeed,
                    modifiedSpeed: modifiedSpeed 
                  },
                  'Speed modifier applied'
                );
              }
            }

            // Marca viewport como sujo para enviar viewport atualizado
            this.markViewportDirty(player);
            moved = true;
          }
        }
      }

      // IMPORTANTE: Não há transição entre mapas nesta implementação
      // Se precisasse, chamaria checkExitAndTransition aqui
    } // Fim do if (processamento de 1 tile por tick)

    // === PASSO 3: Flush atualizações se houve movimento ===
    if (moved) {
      // Envia novo viewport se origem mudou
      this.flushViewportIfDirty(player, now);
      
      // Marca e envia snapshot de posição para outros jogadores IMEDIATAMENTE
      // Isso garante que todos os jogadores vejam a posição atualizada sem delay
      this.markSnapshotDirty(player);
      this.flushSnapshotIfDirty(player, now, true); // immediate = true para ignorar rate limit
    }
  }

  /**
   * Inicia movimento do jogador
   * 
   * Chamado quando cliente envia comando 'h' com direção.
   * 
   * @param {Object} player - Jogador
   * @param {number} dir - Direção (0=cima, 1=direita, 2=baixo, 3=esquerda)
   * 
   * O movimento continua até:
   * - Cliente enviar 'h' sem direção (para)
   * - Jogador atingir borda do mapa
   * - Jogador desconectar
   */
  startMoving(player, dir) {
    // Valida direção (deve ser 0-3)
    if (!Number.isInteger(dir) || dir < 0 || dir > 3) return;
    
    player.dir = dir;      // Atualiza direção
    player.moving = true;  // Marca como movendo
  }

  /**
   * Para movimento do jogador
   * 
   * Chamado quando:
   * - Cliente envia comando 'h' sem direção
   * - Jogador atinge borda do mapa
   * - Jogador desconecta
   * 
   * @param {Object} player - Jogador
   * @param {boolean} sendToSelf - Se true, também envia correção para o próprio jogador
   * 
   * Limpa acumulador e notifica outros jogadores da parada.
   * Se sendToSelf=true, também envia snapshot corrigido ao próprio jogador
   * para garantir sincronização (usado em paradas forçadas, não voluntárias).
   */
  stopMoving(player, sendToSelf = false) {
    player.moving = false;  // Marca como parado
    player._accumMs = 0;    // Limpa acumulador de tempo
    
    // Cria snapshot uma vez para reusar
    const snapshot = this.makePlayerSnapshotPacket(player);
    
    // Envia snapshot para outros jogadores
    // (importante para sincronizar parada)
    this.world.sendToOthersInMap(player, snapshot);
    
    // Se sendToSelf=true, também envia para o próprio jogador
    // Isso garante que o cliente tenha dx=x, dy=y (coordenadas corretas)
    if (sendToSelf) {
      this.world.sendTo(player, snapshot);
    }
  }

  /**
   * Define direção do jogador sem mover
   * 
   * Chamado quando cliente envia comando 'm' (virar sem andar).
   * 
   * @param {Object} player - Jogador
   * @param {number} dir - Direção (0=cima, 1=direita, 2=baixo, 3=esquerda)
   * 
   * Útil para o jogador "olhar" em uma direção sem se mover.
   */
  setHeading(player, dir) {
    // Atualiza direção se válida
    if (Number.isInteger(dir)) player.dir = dir;
    
    // Notifica outros jogadores da mudança de direção
    this.world.sendToOthersInMap(player, this.makePlayerSnapshotPacket(player));
  }

  /**
   * Persiste posição do jogador no banco de dados
   * 
   * Chamado quando:
   * - Jogador desconecta
   * - Servidor está encerrando
   * - Periodicamente (futuro)
   * 
   * @param {Object} player - Jogador
   * @returns {Promise<void>}
   * 
   * A posição é salva no MongoDB para que o jogador possa
   * continuar de onde parou no próximo login.
   */
  async persistPosition(player) {
    // Só salva se tem ID do banco (guests sem conta não têm)
    if (!player.dbId) return;
    
    // Chama model para atualizar no MongoDB
    await savePlayerPosition(player.dbId, player.mapId, player.x, player.y);
  }

  /**
   * Persiste o ESTADO COMPLETO do jogador no banco de dados
   * 
   * Chamado quando:
   * - Jogador desconecta
   * - Servidor está encerrando
   * 
   * @param {Object} player - Jogador
   * @returns {Promise<void>}
   * 
   * Salva todos os campos relevantes: mapId, x, y, dir, level,
   * inventory, appearance, speed. Isso garante que o jogador
   * retome exatamente onde parou no próximo login.
   */
  async persistFullState(player) {
    if (!player?.dbId) return;

    await savePlayerState({
      playerId: player.dbId,
      mapId: player.mapId,
      x: player.x,
      y: player.y,
      dir: player.dir,
      level: player.level,
      inventory: player.inventory,
      appearance: player.appearance,
      speed: player.speed
    });
  }

  /**
   * Sends all pending snapshots in batch
   * 
   * This method sends "pl" (player list) packets containing ALL players
   * within visible range (viewport/chunk) of each player, including
   * stationary players (not just those that moved).
   * 
   * IMPORTANT: When at least one player in a map has a pending snapshot,
   * ALL visible players in each receiver's chunk are included in the "pl" packet.
   * 
   * NETWORK TRAFFIC NOTE:
   * This implementation sends ALL players in viewport, even those that haven't moved.
   * This is the DESIRED behavior per requirement specification:
   * "must send all players within the same chunk, even players that are not moving".
   * 
   * Trade-off Analysis:
   * - PROS: Clients always have complete, up-to-date data for all visible players
   *         Simpler to implement and maintain
   *         Prevents desync issues with stationary players
   * - CONS: Increased network traffic when any player moves
   *         Network usage scales with: (players in viewport)² per map
   * 
   * Alternative Approach (NOT implemented per requirements):
   * Could track individual player state changes and send incremental updates,
   * but this was explicitly NOT requested in the requirements.
   * 
   * Called at end of each game loop tick to send all movement updates in batch.
   * 
   * Packet format:
   * {
   *   type: "pl",
   *   data: [
   *     "{\"type\":\"p\",\"id\":123,...}",
   *     "{\"type\":\"p\",\"id\":456,...}",
   *     ...
   *   ]
   * }
   */
  flushPendingSnapshots() {
    // Collect all maps where at least one player moved
    // For these maps, we'll send ALL visible players (moving + stationary) to all receivers
    const mapsWithUpdates = new Set();
    
    for (const player of this.world.players.values()) {
      if (!player._pendingSnapshot) continue;
      
      const mapId = player.mapId;
      if (!mapId) continue;
      
      mapsWithUpdates.add(mapId);
      
      // Clear pending snapshot flag
      player._pendingSnapshot = false;
    }
    
    // For each map that had updates
    for (const mapId of mapsWithUpdates) {
      // Get all players in the map
      const allPlayersInMap = this.world.getPlayersInMap(mapId);
      
      // For each receiver that needs to receive updates
      for (const receiver of allPlayersInMap) {
        // CHANGE: Send ALL players within chunk/viewport, not just those that moved
        // This ensures stationary players are also included in the "pl" packet
        // 
        // Performance Note: O(n²) complexity per map - each receiver filters all players
        // Acceptable for typical scenarios (<100 players per map)
        // For optimization with larger player counts, consider spatial indexing (quadtree)
        const visiblePlayers = allPlayersInMap.filter(player => {
          // Check if within visible range (chunk)
          return this.isPlayerInViewRange(receiver, player);
        });
        
        // If there are visible players, send "pl" packet with ALL of them
        if (visiblePlayers.length > 0) {
          const plData = this.makePlayerListData(visiblePlayers);
          
          const plPacket = {
            type: 'pl',
            data: plData
          };
          
          // Send pl packet directly - sendRaw will automatically wrap it in pkg
          // Format: pkg > pl > p (as expected by the client)
          this.world.sendTo(receiver, plPacket);
        }
      }
    }
  }

  /**
   * Verifica se um jogador está dentro do range visível de outro
   * 
   * Usa o raio do viewport (MAP_VIEW_RADIUS_X, MAP_VIEW_RADIUS_Y) para
   * determinar se o jogador está dentro da área visível.
   * 
   * @param {Object} viewer - Jogador que está vendo
   * @param {Object} target - Jogador alvo
   * @returns {boolean} True se o target está visível para o viewer
   */
  isPlayerInViewRange(viewer, target) {
    const radiusX = this.env.MAP_VIEW_RADIUS_X;
    const radiusY = this.env.MAP_VIEW_RADIUS_Y;
    
    const dx = Math.abs(viewer.x - target.x);
    const dy = Math.abs(viewer.y - target.y);
    
    // Verifica se está dentro do retângulo de visão
    return dx <= radiusX && dy <= radiusY;
  }
}