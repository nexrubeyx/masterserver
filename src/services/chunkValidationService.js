/**
 * Serviço de Validação de Chunks - Integridade de Dados do Mapa
 * 
 * Este serviço garante que chunks (viewports) enviados aos clientes
 * são corretos, completos e não corrompidos.
 * 
 * Previne:
 * - Envio de chunks com coordenadas inválidas
 * - Chunks com tamanho incorreto
 * - Chunks duplicados ou desatualizados
 * - Dados corrompidos de tiles
 */

import crypto from 'crypto';

export class ChunkValidationService {
  /**
   * Construtor - Inicializa o serviço de validação de chunks
   * 
   * @param {Object} env - Configurações do ambiente
   * @param {Object} logger - Logger
   * @param {Object} world - Instância do World
   */
  constructor(env, logger, world) {
    this.env = env;
    this.logger = logger;
    this.world = world;

    // Cache de checksums de chunks para detectar duplicatas
    // Map: sessionId -> { chunkKey: checksum }
    this.chunkChecksums = new Map();

    // Configurações
    this.maxTileId = Number(env.SECURITY_MAX_TILE_ID || 10000);
    this.chunkCacheSize = Number(env.SECURITY_CHUNK_CACHE_SIZE || 20);

    // Estatísticas de chunks enviados
    this.stats = {
      totalSent: 0,
      duplicatesPrevented: 0,
      validationErrors: 0
    };
  }

  /**
   * Valida dados de um chunk antes de enviar
   * 
   * @param {Object} player - Jogador que receberá o chunk
   * @param {Object} map - Mapa de onde vem o chunk
   * @param {number} ox - Origem X do viewport
   * @param {number} oy - Origem Y do viewport
   * @param {number} radiusX - Raio horizontal do viewport
   * @param {number} radiusY - Raio vertical do viewport
   * @param {string} tilesData - String com dados dos tiles "t1:t2:t3:..."
   * @returns {Object} { valid: boolean, reason?: string, checksum?: string }
   */
  validateChunk(player, map, ox, oy, radiusX, radiusY, tilesData) {
    // === VALIDAÇÃO 1: Parâmetros Básicos ===
    if (!player || !player.sessionId) {
      return { valid: false, reason: 'Player inválido' };
    }

    if (!map || !map.id) {
      return { valid: false, reason: 'Mapa inválido' };
    }

    if (!tilesData || typeof tilesData !== 'string') {
      this._recordError('dados_invalidos', { player: player.sessionId, map: map.id });
      return { valid: false, reason: 'Dados de tiles inválidos' };
    }

    // === VALIDAÇÃO 2: Limites do Viewport ===
    // A origem do viewport não pode ser negativa
    if (ox < 0 || oy < 0) {
      this._recordError('origem_negativa', { ox, oy, player: player.sessionId });
      return { valid: false, reason: 'Origem do viewport não pode ser negativa' };
    }

    // Calcula dimensões do viewport
    const viewportWidth = 2 * radiusX;
    const viewportHeight = 2 * radiusY;

    // Viewport não pode ultrapassar limites do mapa
    // Nota: ox + viewportWidth pode ser > map.width se o mapa é pequeno
    // Neste caso, os tiles fora são preenchidos com DEFAULT_CAVE_WALL
    // Mas vamos verificar se está razoável (não absurdamente fora)
    const maxReasonableOX = map.width + radiusX;
    const maxReasonableOY = map.height + radiusY;

    if (ox > maxReasonableOX || oy > maxReasonableOY) {
      this._recordError('origem_fora_limites', {
        ox, oy,
        maxOX: maxReasonableOX,
        maxOY: maxReasonableOY,
        player: player.sessionId
      });
      return { valid: false, reason: 'Origem do viewport muito além dos limites' };
    }

    // === VALIDAÇÃO 3: Tamanho dos Dados ===
    // Verifica se a string de tiles tem o tamanho esperado
    const tileArray = tilesData.split(':');
    const expectedSize = viewportWidth * viewportHeight;

    if (tileArray.length !== expectedSize) {
      this._recordError('tamanho_incorreto', {
        expected: expectedSize,
        actual: tileArray.length,
        viewport: { width: viewportWidth, height: viewportHeight },
        player: player.sessionId
      });

      this.logger.error(
        {
          expected: expectedSize,
          actual: tileArray.length,
          viewport: { width: viewportWidth, height: viewportHeight },
          ox, oy,
          radiusX, radiusY
        },
        'Chunk com tamanho incorreto'
      );

      return { valid: false, reason: `Chunk com tamanho incorreto: esperado ${expectedSize}, recebido ${tileArray.length}` };
    }

    // === VALIDAÇÃO 4: Conteúdo dos Tiles ===
    // Verifica se todos os tiles são válidos
    // Suporta tiles numéricos (ex: "21") e tiles com underscore (ex: "21_1", "36_1")
    for (let i = 0; i < tileArray.length; i++) {
      const tile = tileArray[i];
      
      // Se o tile contém underscore, é notação de variante (ex: "21_1")
      // Valida o número base antes do underscore
      if (typeof tile === 'string' && tile.includes('_')) {
        const parts = tile.split('_');
        
        // Valida que o tile não começa com underscore (ex: "_1" é inválido)
        // e que há pelo menos 2 partes (base_suffix)
        if (parts[0] === '' || parts.length < 2) {
          this._recordError('tile_invalido', {
            index: i,
            value: tile,
            reason: 'Tile com underscore malformado (falta base ou sufixo)',
            player: player.sessionId
          });
          return { valid: false, reason: `Tile com underscore malformado na posição ${i}: ${tile}` };
        }
        
        const baseTileNum = Number(parts[0]);
        
        // Verifica se a parte base é um número válido
        // Number('') retorna 0, mas já validamos que parts[0] não é vazio acima
        if (!Number.isFinite(baseTileNum)) {
          this._recordError('tile_invalido', {
            index: i,
            value: tile,
            reason: 'Base do tile não é um número válido',
            player: player.sessionId
          });
          return { valid: false, reason: `Tile com underscore inválido na posição ${i}: ${tile}` };
        }
        
        // Verifica se o ID base do tile está em um range razoável
        if (baseTileNum < 0 || baseTileNum > this.maxTileId) {
          this._recordError('tile_fora_range', {
            index: i,
            value: tile,
            baseTile: baseTileNum,
            player: player.sessionId
          });
          return { valid: false, reason: `Tile base fora do range válido: ${tile} (base: ${baseTileNum})` };
        }
        
        // Tile com underscore válido
        continue;
      }
      
      // Tile sem underscore - deve ser número puro
      const tileNum = Number(tile);

      if (!Number.isFinite(tileNum)) {
        this._recordError('tile_invalido', {
          index: i,
          value: tile,
          player: player.sessionId
        });
        return { valid: false, reason: `Tile inválido na posição ${i}: ${tile}` };
      }

      // Verifica se o ID do tile está em um range razoável
      // Tiles tipicamente são 0-1000, mas vamos ser mais permissivos
      if (tileNum < 0 || tileNum > this.maxTileId) {
        this._recordError('tile_fora_range', {
          index: i,
          value: tileNum,
          player: player.sessionId
        });
        return { valid: false, reason: `Tile fora do range válido: ${tileNum}` };
      }
    }

    // === VALIDAÇÃO 5: Checksum e Detecção de Duplicatas ===
    const chunkKey = this._generateChunkKey(player.mapId, ox, oy, radiusX, radiusY);
    const checksum = this._calculateChecksum(tilesData);

    // Verifica se já enviamos este chunk exato para este jogador
    const playerChecksums = this.chunkChecksums.get(player.sessionId);
    if (playerChecksums && playerChecksums[chunkKey] === checksum) {
      this.stats.duplicatesPrevented++;
      this.logger.debug(
        { sessionId: player.sessionId, chunkKey },
        'Chunk duplicado detectado e prevenido'
      );
      // Nota: Retorna valid=true mas com flag duplicate
      return { valid: true, duplicate: true, checksum };
    }

    // Registra checksum deste chunk
    this._recordChunkChecksum(player.sessionId, chunkKey, checksum);

    // === TODAS AS VALIDAÇÕES PASSARAM ===
    this.stats.totalSent++;

    return { valid: true, checksum };
  }

  /**
   * Valida coordenadas do jogador em relação ao chunk
   * 
   * Garante que o chunk enviado é relevante para a posição do jogador.
   * 
   * @param {Object} player - Jogador
   * @param {number} chunkCenterX - Centro X do chunk
   * @param {number} chunkCenterY - Centro Y do chunk
   * @param {number} radiusX - Raio horizontal
   * @param {number} radiusY - Raio vertical
   * @returns {Object} { valid: boolean, reason?: string }
   */
  validatePlayerInChunkRange(player, chunkCenterX, chunkCenterY, radiusX, radiusY) {
    // O chunk deve estar centralizado no jogador (ou próximo dele)
    const distX = Math.abs(player.x - chunkCenterX);
    const distY = Math.abs(player.y - chunkCenterY);

    // Tolerância: jogador deve estar dentro ou próximo do chunk
    // Usamos 2x o raio para ser mais permissivo
    const toleranceX = radiusX * 2;
    const toleranceY = radiusY * 2;

    if (distX > toleranceX || distY > toleranceY) {
      this.logger.warn(
        {
          sessionId: player.sessionId,
          player: { x: player.x, y: player.y },
          chunk: { x: chunkCenterX, y: chunkCenterY },
          distance: { x: distX, y: distY },
          tolerance: { x: toleranceX, y: toleranceY }
        },
        'Chunk muito distante da posição do jogador'
      );

      return { valid: false, reason: 'Chunk não está centrado no jogador' };
    }

    return { valid: true };
  }

  /**
   * Gera chave única para identificar um chunk
   * 
   * @param {string} mapId - ID do mapa
   * @param {number} ox - Origem X
   * @param {number} oy - Origem Y
   * @param {number} rx - Raio X
   * @param {number} ry - Raio Y
   * @returns {string} Chave única
   * @private
   */
  _generateChunkKey(mapId, ox, oy, rx, ry) {
    return `${mapId}:${ox}:${oy}:${rx}:${ry}`;
  }

  /**
   * Calcula checksum (hash MD5) dos dados de tiles
   * 
   * Usado para detectar chunks duplicados ou corrompidos.
   * 
   * NOTA: MD5 é usado aqui apenas para detecção de duplicatas, NÃO para
   * segurança criptográfica. MD5 é rápido e adequado para este propósito.
   * 
   * @param {string} tilesData - String de tiles
   * @returns {string} Checksum MD5
   * @private
   */
  _calculateChecksum(tilesData) {
    return crypto.createHash('md5').update(tilesData).digest('hex');
  }

  /**
   * Registra checksum de um chunk enviado
   * 
   * @param {number} sessionId - ID da sessão do jogador
   * @param {string} chunkKey - Chave do chunk
   * @param {string} checksum - Checksum dos dados
   * @private
   */
  _recordChunkChecksum(sessionId, chunkKey, checksum) {
    if (!this.chunkChecksums.has(sessionId)) {
      this.chunkChecksums.set(sessionId, {});
    }

    const playerChecksums = this.chunkChecksums.get(sessionId);
    playerChecksums[chunkKey] = checksum;

    // Limita tamanho do cache por jogador
    const keys = Object.keys(playerChecksums);
    if (keys.length > this.chunkCacheSize) {
      delete playerChecksums[keys[0]]; // Remove o mais antigo
    }
  }

  /**
   * Limpa dados de um jogador quando desconecta
   * 
   * @param {number} sessionId - ID da sessão
   */
  cleanupPlayer(sessionId) {
    this.chunkChecksums.delete(sessionId);
  }

  /**
   * Registra erro de validação
   * 
   * @param {string} type - Tipo do erro
   * @param {Object} details - Detalhes do erro
   * @private
   */
  _recordError(type, details) {
    this.stats.validationErrors++;

    this.logger.error(
      { type, details },
      'Erro de validação de chunk'
    );
  }

  /**
   * Obtém estatísticas do serviço
   * 
   * @returns {Object} Estatísticas
   */
  getStats() {
    return {
      ...this.stats,
      activePlayers: this.chunkChecksums.size
    };
  }

  /**
   * Reseta estatísticas
   */
  resetStats() {
    this.stats.totalSent = 0;
    this.stats.duplicatesPrevented = 0;
    this.stats.validationErrors = 0;
  }
}
