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

// Tipos de violação de segurança
const VIOLATION_TYPES = {
  OUT_OF_BOUNDS: 'fora_dos_limites',
  TELEPORT: 'teleportacao',
  INVALID_DIRECTION: 'direcao_invalida',
  TOO_FAST: 'movimento_rapido',
  PATH_GAP: 'gap_no_caminho',
  DESYNC: 'dessincronia',
  SEVERE_DESYNC: 'dessincronia_severa'
};

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
    
    // Multiplicador para calcular limite de dessincronia severa
    // severeDesyncThreshold = max(coordTolerance * multiplier, minSevereThreshold)
    this.severeDesyncMultiplier = Number(env.SECURITY_SEVERE_DESYNC_MULTIPLIER || 2);
    
    // Limite mínimo absoluto para dessincronia severa (tiles)
    this.minSevereDesyncThreshold = Number(env.SECURITY_MIN_SEVERE_DESYNC_THRESHOLD || 10);
    
    // Período de tolerância após parar (ms)
    // Durante este período, permite pequena diferença de coordenadas mesmo quando parado
    // Isso compensa lag de rede e predição do cliente
    this.stopGracePeriodMs = Number(env.SECURITY_STOP_GRACE_PERIOD_MS || 200);
    
    // Tolerância de coordenadas durante período de graça (tiles)
    // Permite pequena diferença nas primeiras mensagens após parar
    this.stopGraceTolerance = Number(env.SECURITY_STOP_GRACE_TOLERANCE || 2);
  }

  /**
   * Inicializa rastreamento de posição para um jogador
   * 
   * @param {Object} player - Jogador a rastrear
   */
  initializePlayer(player) {
    if (!player.sessionId) return;

    // Define lastMoveTime no passado para permitir movimento imediato
    // Isso evita bloquear o primeiro movimento do jogador
    const now = Date.now();
    
    this.positionHistory.set(player.sessionId, {
      positions: [{
        x: player.x,
        y: player.y,
        timestamp: now
      }],
      violations: 0,
      lastMoveTime: now - this.minMovementInterval, // Permite movimento imediato
      lastStopTime: 0, // Timestamp da última vez que parou
      lastCorrectionTime: 0 // Timestamp da última correção de coordenadas
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
      this._recordViolation(player, VIOLATION_TYPES.OUT_OF_BOUNDS, { newX, newY, map: player.mapId });
      return { valid: false, reason: 'Posição fora dos limites do mapa' };
    }

    // === VALIDAÇÃO 2: Distância Máxima ===
    // Previne teleportação - movimento válido é apenas 1 tile por vez
    const distance = this._calculateDistance(currentX, currentY, newX, newY);
    
    if (distance > this.maxMoveDistance) {
      this._recordViolation(player, VIOLATION_TYPES.TELEPORT, {
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
        this._recordViolation(player, VIOLATION_TYPES.INVALID_DIRECTION, {
          direction,
          expected: { dx: expectedDx, dy: expectedDy },
          actual: { dx: actualDx, dy: actualDy }
        });
        return { valid: false, reason: 'Movimento não corresponde à direção' };
      }
    }

    // === VALIDAÇÃO 4: Intervalo de Tempo ===
    // Previne movimentos mais rápidos que o permitido pela velocidade
    // Esta validação só se aplica quando o jogador INICIA um novo movimento
    // Durante movimento contínuo, o rate limiting é controlado pelo speed/accumulator
    const timeSinceLastMove = now - history.lastMoveTime;
    
    // Se o jogador já está em movimento contínuo, não aplica rate limit
    // O accumulator em playerService já controla a velocidade
    const isAlreadyMoving = player.moving && player._accumMs !== undefined;
    
    if (!isAlreadyMoving && timeSinceLastMove < this.minMovementInterval) {
      this._recordViolation(player, VIOLATION_TYPES.TOO_FAST, {
        interval: timeSinceLastMove,
        minInterval: this.minMovementInterval
      });
      return { valid: false, reason: 'Movimento muito rápido' };
    }

    // === VALIDAÇÃO 5: Caminho Contínuo ===
    // DESABILITADO: Permite movimento livre para qualquer andar/posição
    // O jogador pode se mover para qualquer coordenada sem seguir um caminho contínuo
    // (Anteriormente forçava A -> B -> C, agora permite A -> C diretamente)
    /*
    if (history.positions.length > 0) {
      const lastPos = history.positions[history.positions.length - 1];
      const gapDistance = this._calculateDistance(lastPos.x, lastPos.y, currentX, currentY);
      
      // Se há um gap maior que 1 tile da última posição registrada, algo está errado
      if (gapDistance > 1) {
        this._recordViolation(player, VIOLATION_TYPES.PATH_GAP, {
          lastRecorded: { x: lastPos.x, y: lastPos.y },
          current: { x: currentX, y: currentY },
          gap: gapDistance
        });
        // Nota: Não invalidamos imediatamente pois pode ser lag
        // Mas registramos para análise
      }
    }
    */

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
   * Estratégia de validação:
   * - Player parado (recentemente): tolerância durante período de graça (compensar lag)
   *   Durante os primeiros ~200ms após parar, permite até 2 tiles de diferença
   * - Player parado (estável): tolerância 0 (deve estar exatamente onde o servidor diz)
   *   Após período de graça, qualquer diferença > 0 força correção
   * - Player em movimento: tolerância de 2 tiles (compensar lag e predição)
   *   Diferenças moderadas (≤ 2) são aceitas
   *   Diferenças severas (> 3) são rejeitadas
   * 
   * O período de graça evita loops de correção quando o cliente ainda não
   * recebeu/processou a confirmação de parada do servidor.
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

    const serverX = player.x;
    const serverY = player.y;
    const distance = this._calculateDistance(serverX, serverY, clientX, clientY);

    // Se coordenadas são exatas, validação passou
    if (distance === 0) {
      return { valid: true, needsCorrection: false };
    }

    // === VALIDAÇÃO PARA PLAYER PARADO ===
    if (!player.moving) {
      const history = this.positionHistory.get(player.sessionId);
      const now = Date.now();
      
      // Verifica se está dentro do período de graça após parar
      const timeSinceStop = history ? (now - history.lastStopTime) : Infinity;
      const inGracePeriod = timeSinceStop < this.stopGracePeriodMs;
      
      // Durante período de graça, permite tolerância maior
      if (inGracePeriod && distance <= this.stopGraceTolerance) {
        this.logger.debug(
          {
            sessionId: player.sessionId,
            client: { x: clientX, y: clientY },
            server: { x: serverX, y: serverY },
            distance,
            timeSinceStop,
            gracePeriod: this.stopGracePeriodMs
          },
          'Player parado em período de graça - aceitando pequena diferença'
        );
        return { valid: true, needsCorrection: false };
      }
      
      // Fora do período de graça ou diferença muito grande - força correção
      this.logger.debug(
        {
          sessionId: player.sessionId,
          client: { x: clientX, y: clientY },
          server: { x: serverX, y: serverY },
          distance,
          inGracePeriod,
          timeSinceStop
        },
        'Player parado com coordenadas incorretas - forçando correção'
      );

      return {
        valid: false,
        reason: `Player parado deve estar em (${serverX}, ${serverY}), não em (${clientX}, ${clientY})`,
        needsCorrection: true
      };
    }

    // === VALIDAÇÃO PARA PLAYER EM MOVIMENTO ===
    // Player em movimento pode ter pequena diferença devido a predição do cliente
    
    // Tolerância para movimento normal (predição do cliente)
    const movementTolerance = 2;
    
    // Limite para dessincronia severa (possível cheating)
    const severeDesyncThreshold = this.minSevereDesyncThreshold; // 3 tiles

    // Se dentro da tolerância de movimento, aceita (predição normal)
    if (distance <= movementTolerance) {
      return { valid: true, needsCorrection: false };
    }

    // Se exceder limite severo, é possível cheating - rejeita e força correção
    if (distance > severeDesyncThreshold) {
      this._recordViolation(player, VIOLATION_TYPES.SEVERE_DESYNC, {
        client: { x: clientX, y: clientY },
        server: { x: serverX, y: serverY },
        distance,
        tolerance: movementTolerance,
        severeThreshold: severeDesyncThreshold
      });

      this.logger.warn(
        {
          sessionId: player.sessionId,
          client: { x: clientX, y: clientY },
          server: { x: serverX, y: serverY },
          distance,
          severeThreshold: severeDesyncThreshold
        },
        'Dessincronia severa detectada - possível cheating - forçando correção'
      );

      return { 
        valid: false, 
        reason: `Dessincronia severa: distância ${distance} (limite: ${severeDesyncThreshold})`,
        needsCorrection: true 
      };
    }

    // Diferença moderada (3 tiles): loga mas aceita para evitar teleportação
    // Isso cobre o caso intermediário onde há lag mas não é cheating
    this.logger.debug(
      {
        sessionId: player.sessionId,
        client: { x: clientX, y: clientY },
        server: { x: serverX, y: serverY },
        distance,
        tolerance: movementTolerance
      },
      'Dessincronia moderada durante movimento - aceitando'
    );

    // Aceita comando apesar da dessincronia moderada
    return { valid: true, needsCorrection: false };
  }

  /**
   * Registra que o jogador parou de se mover
   * 
   * Deve ser chamado pelo playerService.stopMoving() para iniciar
   * o período de graça de coordenadas.
   * 
   * @param {Object} player - Jogador que parou
   */
  recordPlayerStop(player) {
    if (!player.sessionId) return;
    
    const history = this.positionHistory.get(player.sessionId);
    if (!history) return;
    
    history.lastStopTime = Date.now();
    
    this.logger.debug(
      { sessionId: player.sessionId, x: player.x, y: player.y },
      'Registrando parada do jogador - iniciando período de graça'
    );
  }

  /**
   * Verifica se deve enviar correção de coordenadas
   * 
   * Rate-limita correções para evitar spam quando cliente está
   * enviando comandos rapidamente com coordenadas desatualizadas.
   * 
   * Permite no máximo 1 correção a cada 100ms por jogador.
   * 
   * @param {Object} player - Jogador
   * @returns {boolean} true se deve enviar correção, false caso contrário
   */
  shouldSendCorrection(player) {
    if (!player.sessionId) return true;
    
    const history = this.positionHistory.get(player.sessionId);
    if (!history) return true;
    
    const now = Date.now();
    const timeSinceLastCorrection = now - history.lastCorrectionTime;
    const minCorrectionInterval = 100; // 100ms entre correções
    
    if (timeSinceLastCorrection < minCorrectionInterval) {
      this.logger.debug(
        { 
          sessionId: player.sessionId,
          timeSinceLastCorrection,
          minInterval: minCorrectionInterval
        },
        'Correção suprimida - rate limit'
      );
      return false;
    }
    
    // Atualiza timestamp da última correção
    history.lastCorrectionTime = now;
    return true;
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
