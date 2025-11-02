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
import { isDeepWater } from '../constants/tiles.js';

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
   * - s: sprite (>= 0 = monstro, -1 = humano)
   * - b, h, c: body, hair, clothes (índices de sprite)
   * - hc, cc, ec: hair color, clothes color, eye color (RGB decimal)
   */
  makePlayerTemplatePacket(player) {
    return {
      type: 'plr_tpl',
      id: String(player.sessionId),
      n: player.name,
      t: '',  // Título (vazio por padrão)
      l: player.level,
      p: player.appearance.nameColor,    // Cor do nome
      pr: 0,  // Prefixo (não usado)
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
   * - s: velocidade (ms/tile)
   * - d: direção (0=cima, 1=direita, 2=baixo, 3=esquerda)
   * - ch: channel/camada (0 = padrão)
   */
  makePlayerSnapshotPacket(player) {
    return {
      type: 'p',
      id: String(player.sessionId),
      tpl: String(player.sessionId),
      x: player.x,
      y: player.y,
      s: player.speed || 300,
      d: player.dir || 0,
      ch: 0  // Channel (não usado, sempre 0)
    };
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
      // Origem máxima = tamanho do mapa - tamanho do viewport
      const maxOX = Math.max(0, map.width - (2 * radiusX));
      const maxOY = Math.max(0, map.height - (2 * radiusY));
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
   * O viewport é marcado se a origem OU a posição do jogador mudou.
   * Isso garante que chunks sejam carregados corretamente mesmo perto das bordas do mapa.
   * Múltiplas mudanças no mesmo tick resultam em apenas um envio.
   */
  markViewportDirty(player) {
    const { ox, oy } = this.getViewportOrigin(player);
    
    // Marca como dirty se origem mudou OU se posição do jogador mudou
    // Isso é essencial para bordas do mapa onde a origem pode ficar clamped
    // mas o jogador continua se movendo
    const originChanged = (player._lastViewOX !== ox || player._lastViewOY !== oy);
    const positionChanged = (player._lastViewPlayerX !== player.x || player._lastViewPlayerY !== player.y);
    
    if (originChanged || positionChanged) {
      player._viewDirty = true;
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

    // Limpa flag e atualiza origem guardada E posição do jogador
    player._viewDirty = false;
    player._lastViewOX = player._pendingOX;
    player._lastViewOY = player._pendingOY;
    player._lastViewPlayerX = player.x;
    player._lastViewPlayerY = player.y;
    player._lastMapAt = now;

    // Obtém o mapa atual
    const map = this.world.mapService.getMap(player.mapId);
    if (!map) return;
    
    // Constrói payload com tiles visíveis
    const tiles = this.world.mapService.buildViewportPayload(
      map,
      player.x,
      player.y,
      this.env.MAP_VIEW_RADIUS_X,
      this.env.MAP_VIEW_RADIUS_Y
    );
    
    // Envia pacote 'map' com tiles
    this.world.sendTo(player, { type: 'map', x: player.x, y: player.y, tiles });

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
   * 
   * Envia pacote 'p' para OUTROS jogadores no mesmo mapa.
   * Não envia para o próprio jogador (ele já sabe onde está).
   */
  flushSnapshotIfDirty(player, now) {
    // Não faz nada se snapshot não mudou
    if (!player._snapshotDirty) return;
    
    // Rate limiting: respeita intervalo mínimo entre snapshots
    if (now - (player._lastSnapshotAt || 0) < this._snapshotMinInterval) return;

    // Envia snapshot para outros jogadores (não para si mesmo)
    this.world.sendToOthersInMap(player, this.makePlayerSnapshotPacket(player));
    
    // Atualiza timestamp e limpa flag
    player._lastSnapshotAt = now;
    player._snapshotDirty = false;
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
    const stepMs = Math.max(20, player.speed || 750);

    // Flag para saber se houve movimento neste tick
    let moved = false;
    
    // Processa múltiplos passos se acumulou tempo suficiente
    // Exemplo: se acumulou 1500ms e stepMs é 750ms, faz 2 passos
    while (player._accumMs >= stepMs) {
      const map = this.world.mapService.getMap(player.mapId);
      if (!map) break;  // Mapa não existe, para movimento

      // === CÁLCULO DA PRÓXIMA POSIÇÃO ===
      // Direção: 0=cima, 1=direita, 2=baixo, 3=esquerda
      const dx = (player.dir === 1 ? 1 : player.dir === 3 ? -1 : 0);
      const dy = (player.dir === 2 ? 1 : player.dir === 0 ? -1 : 0);
      const nx = player.x + dx;  // Próxima posição X
      const ny = player.y + dy;  // Próxima posição Y

      // Consome o tempo deste passo do acumulador
      player._accumMs -= stepMs;

      // === VALIDAÇÃO DE BORDAS ===
      // Bordas do mapa são INACESSÍVEIS nesta implementação
      // Se tentar sair do mapa, bloqueia e não altera x/y
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) {
        // Não move, não marca viewport, não envia nada
        // Para o loop (movimento bloqueado)
        break;
      }

      // === VALIDAÇÃO DE TILE (DEEP WATER) ===
      // Deep water tiles (215, 248, 325) are blocked by default
      // Unless player has canSwim capability (future feature)
      const tileAtTarget = map.tiles[ny]?.[nx];
      if (Number.isFinite(tileAtTarget) && isDeepWater(tileAtTarget)) {
        // Check if player can swim (future: player.canSwim)
        const canSwim = player.canSwim || false;
        if (!canSwim) {
          // Movement blocked by deep water
          break;
        }
      }
      
     

      // === MOVIMENTO VÁLIDO ===
      // Passo está dentro do mapa, aplica movimento
      player.x = nx;
      player.y = ny;

      // Marca viewport como sujo para enviar viewport atualizado
      this.markViewportDirty(player);
      moved = true;

      // IMPORTANTE: Não há transição entre mapas nesta implementação
      // Se precisasse, chamaria checkExitAndTransition aqui
    }

    // === PASSO 3: Flush atualizações se houve movimento ===
    if (moved) {
      // Envia novo viewport se origem mudou
      this.flushViewportIfDirty(player, now);
      
      // Marca e envia snapshot de posição para outros jogadores
      this.markSnapshotDirty(player);
      this.flushSnapshotIfDirty(player, now);
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
   * 
   * Limpa acumulador e notifica outros jogadores da parada.
   */
  stopMoving(player) {
    player.moving = false;  // Marca como parado
    player._accumMs = 0;    // Limpa acumulador de tempo
    
    // Envia snapshot para outros jogadores
    // (importante para sincronizar parada)
    this.world.sendToOthersInMap(player, this.makePlayerSnapshotPacket(player));
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
}