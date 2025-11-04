/**
 * Serviço de Segurança - Validação de Movimentos e Coordenadas
 * 
 * Este serviço implementa validações de segurança para prevenir:
 * - Teleportação (movimento de A para C sem passar por B)
 * - Manipulação de coordenadas pelo cliente
 * - Movimentos impossíveis (velocidade anormal)
 * - Posições fora dos limites do mapa
 * 
 * O servidor mantém autoridade sobre a posição real dos jogadores.
 * Comandos do cliente são validados contra o estado do servidor.
 */

export class SecurityService {
  /**
   * Construtor - Inicializa o serviço de segurança
   * 
   * @param {Object} env - Configurações do ambiente
   * @param {Object} logger - Logger
   * @param {Object} world - Instância do World
   */
  constructor(env, logger, world) {
    this.env = env;
    this.logger = logger;
    this.world = world;

    // Histórico de posições para validação
    // Map: sessionId -> { positions: Array<{x, y, timestamp}>, violations: number }
    this.positionHistory = new Map();

    // Configurações de segurança
    this.maxViolations = Number(env.SECURITY_MAX_VIOLATIONS || 5);
    this.historySize = Number(env.SECURITY_HISTORY_SIZE || 10);
    
    // Tolerância máxima de distância por movimento (em tiles)
    // Com movimento tile-by-tile, um movimento nunca deve ser > 1 tile
    this.maxMoveDistance = Number(env.SECURITY_MAX_MOVE_DISTANCE || 1);
    
    // Tolerância de tempo mínimo entre movimentos (ms)
    // Previne movimentos mais rápidos que o permitido
    this.minMovementInterval = Number(env.SECURITY_MIN_MOVE_INTERVAL || 20);
    
    // Tolerância para coordenadas cliente/servidor (compensar lag)
    this.coordTolerance = Number(env.SECURITY_COORD_TOLERANCE || 2);
    
    // Limite de distância para registrar violação significativa (evita spam de logs)
    this.significantViolationThreshold = Number(env.SECURITY_SIGNIFICANT_VIOLATION_THRESHOLD || 2);
  }

  /**
   * Inicializa rastreamento de posição para um jogador
   * 
   * @param {Object} player - Jogador a rastrear
   */
  initializePlayer(player) {
    if (!player.sessionId) return;

    this.positionHistory.set(player.sessionId, {
      positions: [{
        x: player.x,
        y: player.y,
        timestamp: Date.now()
      }],
      violations: 0,
      lastMoveTime: Date.now()
    });

    this.logger.debug(
      { sessionId: player.sessionId, x: player.x, y: player.y },
      'Rastreamento de segurança inicializado'
    );
  }

  /**
   * Remove rastreamento quando jogador desconecta
   * 
   * @param {Object} player - Jogador
   */
  cleanupPlayer(player) {
    if (!player.sessionId) return;
    this.positionHistory.delete(player.sessionId);
  }

  /**
   * Valida movimento de jogador
   * 
   * Esta é a principal função de validação que garante que o movimento
   * do jogador é legítimo e segue as regras do jogo.
   * 
   * @param {Object} player - Jogador tentando se mover
   * @param {number} newX - Nova posição X
   * @param {number} newY - Nova posição Y
   * @param {number} direction - Direção do movimento (0-3)
   * @returns {Object} { valid: boolean, reason?: string }
   */
  validateMovement(player, newX, newY, direction) {
    if (!player.sessionId) {
      return { valid: false, reason: 'Player sem sessionId' };
    }

    // Obtém histórico do jogador
    const history = this.positionHistory.get(player.sessionId);
    if (!history) {
      // Se não tem histórico, inicializa
      this.initializePlayer(player);
      return { valid: true };
    }

    const currentX = player.x;
    const currentY = player.y;
    const now = Date.now();

    // === VALIDAÇÃO 1: Limites do Mapa ===
    const map = this.world.mapService.getMap(player.mapId);
    if (!map) {
      return { valid: false, reason: 'Mapa não encontrado' };
    }

    if (newX < 0 || newY < 0 || newX >= map.width || newY >= map.height) {
      this._recordViolation(player, 'fora_dos_limites', { newX, newY, map: player.mapId });
      return { valid: false, reason: 'Posição fora dos limites do mapa' };
    }

    // === VALIDAÇÃO 2: Distância Máxima ===
    // Previne teleportação - movimento válido é apenas 1 tile por vez
    const distance = this._calculateDistance(currentX, currentY, newX, newY);
    
    if (distance > this.maxMoveDistance) {
      this._recordViolation(player, 'teleportacao', {
        from: { x: currentX, y: currentY },
        to: { x: newX, y: newY },
        distance
      });
      return { valid: false, reason: `Movimento muito grande: ${distance} tiles (max: ${this.maxMoveDistance})` };
    }

    // === VALIDAÇÃO 3: Direção do Movimento ===
    // Garante que o movimento está na direção especificada
    // 0=cima, 1=direita, 2=baixo, 3=esquerda
    if (Number.isInteger(direction)) {
      const expectedDx = (direction === 1 ? 1 : direction === 3 ? -1 : 0);
      const expectedDy = (direction === 2 ? 1 : direction === 0 ? -1 : 0);
      const actualDx = newX - currentX;
      const actualDy = newY - currentY;

      if (actualDx !== expectedDx || actualDy !== expectedDy) {
        this._recordViolation(player, 'direcao_invalida', {
          direction,
          expected: { dx: expectedDx, dy: expectedDy },
          actual: { dx: actualDx, dy: actualDy }
        });
        return { valid: false, reason: 'Movimento não corresponde à direção' };
      }
    }

    // === VALIDAÇÃO 4: Intervalo de Tempo ===
    // Previne movimentos mais rápidos que o permitido pela velocidade
    const timeSinceLastMove = now - history.lastMoveTime;
    
    if (timeSinceLastMove < this.minMovementInterval) {
      this._recordViolation(player, 'movimento_rapido', {
        interval: timeSinceLastMove,
        minInterval: this.minMovementInterval
      });
      return { valid: false, reason: 'Movimento muito rápido' };
    }

    // === VALIDAÇÃO 5: Caminho Contínuo ===
    // Verifica se o jogador está seguindo um caminho contínuo
    // (A -> B -> C), não pulando posições
    if (history.positions.length > 0) {
      const lastPos = history.positions[history.positions.length - 1];
      const gapDistance = this._calculateDistance(lastPos.x, lastPos.y, currentX, currentY);
      
      // Se há um gap maior que 1 tile da última posição registrada, algo está errado
      if (gapDistance > 1) {
        this._recordViolation(player, 'gap_no_caminho', {
          lastRecorded: { x: lastPos.x, y: lastPos.y },
          current: { x: currentX, y: currentY },
          gap: gapDistance
        });
        // Nota: Não invalidamos imediatamente pois pode ser lag
        // Mas registramos para análise
      }
    }

    // === TODAS AS VALIDAÇÕES PASSARAM ===
    // Registra nova posição no histórico
    this._recordPosition(player, newX, newY, now);
    history.lastMoveTime = now;

    return { valid: true };
  }

  /**
   * Valida coordenadas recebidas do cliente
   * 
   * O cliente envia comandos 'h' e 'm' com coordenadas x, y.
   * Esta função verifica se essas coordenadas correspondem ao
   * estado do servidor (autoridade do servidor).
   * 
   * Com tolerância 0, implementamos strict server authority:
   * - O servidor é a única fonte de verdade para posições
   * - Qualquer diferença resulta em correção imediata
   * - Previne completamente dessincronia de posições
   * 
   * @param {Object} player - Jogador
   * @param {number} clientX - Posição X enviada pelo cliente
   * @param {number} clientY - Posição Y enviada pelo cliente
   * @returns {Object} { valid: boolean, reason?: string, needsCorrection: boolean }
   */
  validateClientCoordinates(player, clientX, clientY) {
    if (!player) {
      return { valid: false, reason: 'Player inválido', needsCorrection: false };
    }

    // Usa tolerância configurada no construtor
    const tolerance = this.coordTolerance;

    const serverX = player.x;
    const serverY = player.y;

    const distance = this._calculateDistance(serverX, serverY, clientX, clientY);

    // Se coordenadas são exatas, validação passou
    if (distance === 0) {
      return { valid: true, needsCorrection: false };
    }

    // Se há qualquer diferença além da tolerância, precisa correção
    // Com tolerância 0, qualquer diferença (distance > 0) resulta em needsCorrection = true
    if (distance > tolerance) {
      // Registra violação apenas se exceder limite significativo
      // Isso evita spam de logs para pequenas diferenças causadas por lag
      if (distance > this.significantViolationThreshold) {
        this._recordViolation(player, 'dessincronia', {
          client: { x: clientX, y: clientY },
          server: { x: serverX, y: serverY },
          distance,
          tolerance
        });
      }

      this.logger.debug(
        {
          sessionId: player.sessionId,
          client: { x: clientX, y: clientY },
          server: { x: serverX, y: serverY },
          distance
        },
        'Coordenadas do cliente diferem do servidor - enviando correção'
      );

      return { 
        valid: false, 
        reason: `Dessincronia detectada: distância ${distance} (max: ${tolerance})`,
        needsCorrection: true 
      };
    }

    return { valid: true, needsCorrection: false };
  }

  /**
   * Calcula distância Manhattan entre dois pontos
   * 
   * Usamos Manhattan (|dx| + |dy|) em vez de Euclidiana (sqrt(dx² + dy²))
   * porque movimento é baseado em grid (tiles).
   * 
   * @param {number} x1 - X do primeiro ponto
   * @param {number} y1 - Y do primeiro ponto
   * @param {number} x2 - X do segundo ponto
   * @param {number} y2 - Y do segundo ponto
   * @returns {number} Distância Manhattan
   * @private
   */
  _calculateDistance(x1, y1, x2, y2) {
    return Math.abs(x2 - x1) + Math.abs(y2 - y1);
  }

  /**
   * Registra posição no histórico do jogador
   * 
   * Mantém histórico limitado das últimas N posições para análise.
   * 
   * @param {Object} player - Jogador
   * @param {number} x - Posição X
   * @param {number} y - Posição Y
   * @param {number} timestamp - Timestamp do movimento
   * @private
   */
  _recordPosition(player, x, y, timestamp) {
    const history = this.positionHistory.get(player.sessionId);
    if (!history) return;

    history.positions.push({ x, y, timestamp });

    // Limita tamanho do histórico
    if (history.positions.length > this.historySize) {
      history.positions.shift(); // Remove o mais antigo
    }
  }

  /**
   * Registra violação de segurança
   * 
   * Incrementa contador de violações e loga para análise.
   * Se exceder limite, pode desconectar o jogador.
   * 
   * @param {Object} player - Jogador
   * @param {string} type - Tipo da violação
   * @param {Object} details - Detalhes da violação
   * @private
   */
  _recordViolation(player, type, details) {
    const history = this.positionHistory.get(player.sessionId);
    if (!history) return;

    history.violations++;

    this.logger.warn(
      {
        sessionId: player.sessionId,
        name: player.name,
        type,
        details,
        totalViolations: history.violations
      },
      'Violação de segurança detectada'
    );

    // Se excedeu limite de violações, marca jogador como suspeito
    if (history.violations >= this.maxViolations) {
      this.logger.error(
        {
          sessionId: player.sessionId,
          name: player.name,
          violations: history.violations
        },
        'Jogador excedeu limite de violações - possível cheat'
      );

      // Aqui poderia desconectar o jogador ou tomar outras ações
      // Por enquanto apenas loga
    }
  }

  /**
   * Obtém estatísticas de segurança de um jogador
   * 
   * @param {Object} player - Jogador
   * @returns {Object|null} Estatísticas ou null se não rastreado
   */
  getPlayerStats(player) {
    if (!player.sessionId) return null;

    const history = this.positionHistory.get(player.sessionId);
    if (!history) return null;

    return {
      violations: history.violations,
      positionsTracked: history.positions.length,
      lastPosition: history.positions[history.positions.length - 1],
      suspicious: history.violations >= this.maxViolations
    };
  }

  /**
   * Reseta violações de um jogador
   * 
   * Útil para dar segunda chance após comportamento suspeito.
   * 
   * @param {Object} player - Jogador
   */
  resetViolations(player) {
    if (!player.sessionId) return;

    const history = this.positionHistory.get(player.sessionId);
    if (history) {
      history.violations = 0;
      this.logger.info(
        { sessionId: player.sessionId },
        'Violações resetadas'
      );
    }
  }
}
