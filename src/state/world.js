/**
 * World - Gerenciador Central do Estado do Jogo
 * 
 * Esta classe é o coração do servidor, gerenciando:
 * - Todas as sessões ativas de jogadores
 * - Game loop principal (tick a cada 50ms)
 * - Comunicação entre jogadores
 * - Serviços de mapa, jogador e chat
 * 
 * Estrutura de dados:
 * - sessions: Map(WebSocket -> {ws, user, player}) - conexões ativas
 * - players: Map(sessionId -> player) - jogadores ativos por ID
 * 
 * Ciclo de vida:
 * 1. init() - carrega mapas e inicia game loop
 * 2. attachSession() - adiciona jogador quando faz login
 * 3. tick loop - atualiza todos os jogadores periodicamente
 * 4. handleDisconnect() - remove jogador quando desconecta
 * 5. shutdown() - salva tudo e encerra graciosamente
 */

import { MapService } from '../services/mapService.js';
import { PlayerService } from '../services/playerService.js';
import { ChatService } from '../services/chatService.js';
import { ObjectService } from '../services/objectService.js';

export class World {
  /**
   * Construtor - Inicializa o mundo do jogo
   * 
   * @param {Object} env - Configurações do ambiente
   * @param {Object} logger - Logger para registrar eventos
   */
  constructor(env, logger) {
    this.env = env;
    this.logger = logger;

    // Serviço que gerencia mapas (carrega JSON, viewport, etc)
    this.mapService = new MapService(env, logger);

    // Mapa de sessões ativas: WebSocket -> {ws, user, player}
    this.sessions = new Map();

    // Mapa de jogadores ativos: sessionId -> player
    this.players = new Map();

    // Serviço que gerencia jogadores (movimento, snapshots, etc)
    this.playerService = new PlayerService(env, logger, this);

    // Serviço que gerencia chat (mensagens, comandos, etc)
    this.chatService = new ChatService(env, logger, this);

    // Serviço que gerencia objetos do mundo (stone, wood, bush, etc)
    this.objectService = new ObjectService(env, logger, this);

    // Próximo ID de sessão a ser atribuído (incrementa sempre)
    this._nextSessionId = 1000;

    // Timer do game loop (setInterval)
    this._tickTimer = null;

    // Timestamp do último tick (para calcular delta time)
    this._lastTickAt = Date.now();
  }

  /**
   * Inicializa o mundo
   * 
   * Chamado durante a inicialização do servidor.
   * Carrega todos os mapas e inicia o game loop.
   * 
   * @returns {Promise<void>}
   */
  async init() {
    // Carrega todos os arquivos de mapa da pasta maps/worlds/
    await this.mapService.loadAll();

    // Inicializa o serviço de objetos (carrega estado dos objetos)
    await this.objectService.init();

    // Inicia o loop principal do jogo
    this.startGameLoop();
  }

  /**
   * Inicia o game loop principal
   * 
   * O game loop executa a cada TICK_MS milissegundos (padrão: 50ms = 20 ticks/seg)
   * e atualiza todos os jogadores ativos, processando:
   * - Movimento contínuo dos jogadores
   * - Atualização de viewport (tiles visíveis)
   * - Envio de snapshots de posição para outros jogadores
   * 
   * Usa delta time (dt) para compensar variações no tempo de execução.
   */
  startGameLoop() {
    // Intervalo do tick em milissegundos (50ms = 20 Hz)
    const TICK_MS = Number(this.env.TICK_MS || 50);

    // Para timer anterior se existir (evita múltiplos loops)
    if (this._tickTimer) clearInterval(this._tickTimer);

    // Inicializa timestamp do último tick
    this._lastTickAt = Date.now();

    // Cria interval que executa o tick periodicamente
    this._tickTimer = setInterval(() => {
      const now = Date.now();

      // Calcula delta time (tempo decorrido desde último tick)
      const dt = now - this._lastTickAt;
      this._lastTickAt = now;

      // Atualiza todos os jogadores conectados
      for (const player of this.players.values()) {
        this.playerService.tickPlayer(player, dt);
      }
    }, TICK_MS);

    this.logger.info({ TICK_MS }, 'Game loop iniciado');
  }


  // ADICIONE este método dentro da classe World
broadcastPlayersListToMap(mapId) {
  if (!mapId) return;
  try {
    // Pega lista ATUAL de players no mapa (já sem o desconectado)
    const players = this.getPlayersInMap(mapId);

    // Monta o "pl" no formato esperado pelo client:
    // data é um array de strings JSON contendo pacotes 'p'
    const data = players.map((p) => {
      const snap = this.playerService.makePlayerSnapshotPacket(p); // { type:'p', id, x, y, ... }
      return JSON.stringify(snap);
    });

    this.broadcastInMap(mapId, { type: 'pl', data });
  } catch (err) {
    this.logger?.warn({ err: err?.message, stack: err?.stack, mapId }, 'Falha ao broadcast pl');
  }
}

  /**
   * Desliga o mundo graciosamente
   * 
   * Chamado quando o servidor está encerrando (SIGINT/SIGTERM).
   * 
   * Processo:
   * 1. Para o game loop
   * 2. Para movimento de todos os jogadores
   * 3. Salva posição de todos no banco de dados
   * 4. Fecha todas as conexões WebSocket
   * 5. Limpa estruturas de dados
   * 
   * @returns {Promise<void>}
   */
  async shutdown() {
    // Para o game loop
    if (this._tickTimer) clearInterval(this._tickTimer);

    // Processa cada sessão ativa
    for (const [ws, session] of this.sessions) {
      try {
        // Para movimento do jogador
        this.playerService.stopMoving(session.player);

        // Salva estado completo no banco (não bloqueia shutdown)
        await this.playerService.persistFullState(session.player);
      } catch { }

      try {
        // Fecha conexão WebSocket
        ws.close();
      } catch { }
    }

    // Limpa mapas de sessões e jogadores
    this.sessions.clear();
    this.players.clear();
  }

  /**
   * Anexa uma sessão de jogador ao mundo
   * 
   * Chamado após login bem-sucedido para registrar o jogador no mundo.
   * Inicializa todos os campos de estado necessários para o jogador.
   * 
   * IMPORTANTE: Se já existe uma sessão ativa para este userId, ela será
   * desconectada para garantir que cada usuário tenha apenas uma sessão ativa.
   * Isso previne jogadores duplicados no mapa.
   * 
   * @param {WebSocket} ws - Conexão WebSocket do jogador
   * @param {Object} params - Dados da sessão
   * @param {Object} params.user - Documento do usuário
   * @param {Object} params.player - Documento do personagem
   * 
   * Campos inicializados no player:
   * - sessionId: ID único da sessão
   * - name, level: dados básicos
   * - speed, moving, dir: estado de movimento
   * - _viewDirty, _snapshotDirty: flags de rede
   */
  attachSession(ws, { user, player }) {
    // === PREVENÇÃO DE MÚLTIPLAS SESSÕES ===
    // Procura se já existe uma sessão ativa para este userId
    // Se existir, desconecta a antiga (mantém apenas a mais recente)
    // 
    // NOTA: Esta é uma busca O(n) nas sessões ativas. Para otimização futura,
    // poderia-se manter um Map separado userId->session para lookup O(1).
    // Porém, este código só executa no login (não no hot path) e a maioria
    // dos servidores terá <1000 sessões simultâneas, tornando o impacto mínimo.
    // === BLOQUEIO DE LOGIN DUPLICADO ===
    // Se já existe uma sessão ativa para este userId, rejeita o novo login
    for (const [existingWs, existingSession] of this.sessions) {
      if (String(existingSession.user?._id) === String(user?._id)) {
        this.sendRaw(ws, { type: 'logmsg', text: 'Already online.' });
        return;
      }
    }

    // Gera ID único para esta sessão (incrementa sempre)
    const sessionId = String(this._nextSessionId++);
    player.sessionId = sessionId;

    // Garante que player tem nome e nível
    player.name = player.name || user.username;
    player.level = player.level || this.env.DEFAULT_LEVEL;

    // === ESTADO DE MOVIMENTO ===
    player.speed = player.speed || 750;  // Velocidade em ms/tile
    player.moving = false;               // Se está se movendo atualmente
    player._accumMs = 0;                 // Acumulador de tempo para movimento
    player.dir = Number.isInteger(player.dir) ? player.dir : 0;  // Direção (0-3)

    // === ESTADO DE VIEWPORT / REDE ===
    player._lastViewOX = undefined;      // Última origem X do viewport enviado
    player._lastViewOY = undefined;      // Última origem Y do viewport enviado
    player._viewDirty = false;           // Se precisa enviar novo viewport
    player._lastMapAt = 0;               // Timestamp do último envio de mapa
    player._snapshotDirty = false;       // Se precisa enviar snapshot de posição
    player._lastSnapshotAt = 0;          // Timestamp do último snapshot

    // Cria objeto de sessão completo
    const session = { ws, user, player };

    // Registra em ambos os mapas
    this.sessions.set(ws, session);           // WebSocket -> sessão
    this.players.set(sessionId, player);      // sessionId -> player

    this.logger.info({ user: user.username, sessionId, mapId: player.mapId }, 'Sessão anexada');
  }

  /**
   * Obtém sessão associada a uma conexão WebSocket
   * 
   * @param {WebSocket} ws - Conexão WebSocket
   * @returns {Object|undefined} Objeto {ws, user, player} ou undefined
   */
  getSession(ws) {
    return this.sessions.get(ws);
  }

  /**
   * Trata desconexão de um jogador
   * 
   * Chamado quando uma conexão WebSocket é fechada.
   * 
   * NOTA: Este método é idempotente - pode ser chamado múltiplas vezes
   * com a mesma conexão sem efeitos colaterais. A primeira chamada processa
   * a desconexão e remove a sessão; chamadas subsequentes retornam imediatamente.
   * 
   * Processo:
   * 1. Para movimento do jogador
   * 2. Notifica outros jogadores no mapa sobre a remoção
   * 3. Salva posição no banco de dados (async, não bloqueia)
   * 4. Remove das estruturas de dados
   * 5. Registra no log
   * 
   * @param {WebSocket} ws - Conexão que foi fechada
   */
  // Dentro da classe World
  // ... imports e código existentes ...



// SUBSTITUA seu handleDisconnect por este (dentro da classe World)
handleDisconnect(ws) {
  // Idempotente: se já foi removido, sai
  const session = this.sessions.get(ws);
  if (!session) return;

  const { player, user } = session;

  // 1) Para movimento do jogador (se seu loop usa esta flag)
  try {
    player.moving = false;
  } catch {}

  // 2) Envia aos outros do mesmo mapa: mensagem e efeito "poofed"
  try {
    const name = (player?.name && String(player.name)) || `guest-${player?.sessionId ?? ''}`;
    const leaveText = `<span style='color:#99ff99'>${name} has left.</span>`;

    // Mensagem no chat
    this.sendToOthersInMap?.(player, { type: 'message', text: leaveText });

    // Template do efeito (safe re-send)
    this.sendToOthersInMap?.(player, {
      type: 'fx_tpl',
      tpl: 'poofed',
      code:
        `{sound: 'pop',x: 13,y: 38,dir: 16777215,template: 'poofed',base_template: 'poofed',start: function()
{
    this.life = 90;

    for(var i =0;i<15;i++) {
        var c = this.sprite(919);
        c.tint = this.dir;
        c.y += 8;
        c.dx = Math.random()*0.4-0.2;
        c.dy = Math.random()*0.4-0.6;
        c.scale.x = 1;
        c.scale.y = 1;
        c.dr = Math.random() > 0.5 ? 0.005 : -0.005;
        c.alpha = 0.20;
        c.life = 90;
    }
},run: function()
{
},move: function(p)
{
    p.alpha -= Math.random()*0.010;
    p.scale.x += 0.02;
    p.scale.y += 0.02;
    p.rotation += p.dr;
}}`
    });

    // Execução do efeito na posição do jogador
    this.sendToOthersInMap?.(player, {
      type: 'fx',
      tpl: 'poofed',
      x: Number(player?.x ?? 0),
      y: Number(player?.y ?? 0),
      s: 'pop',
      d: 16777215
    });
  } catch (err) {
    this.logger?.warn({ err: err?.message, stack: err?.stack, sessionId: player?.sessionId }, 'Falha ao enviar mensagem/efeito de saída');
  }

  // 3) Persistência assíncrona do estado completo
  (async () => {
    try {
      await this.playerService.persistFullState(player);
    } catch (err) {
      this.logger?.warn({ err: err?.message, stack: err?.stack, sessionId: player?.sessionId }, 'Falha ao salvar estado no disconnect');
    }
  })();

  // 4) Remove das estruturas de dados
  try {
    // Remove sessão
    this.sessions.delete(ws);

    // Remove do índice de players
    if (player?.sessionId && this.players.has(player.sessionId)) {
      this.players.delete(player.sessionId);
    } else {
      for (const [sid, p] of this.players) {
        if (p === player) {
          this.players.delete(sid);
          break;
        }
      }
    }

    // Remove dos índices por mapa (se houver)
    this.mapService?.removePlayerFromMap?.(player?.mapId, player);
  } catch (err) {
    this.logger?.warn({ err: err?.message, stack: err?.stack, sessionId: player?.sessionId }, 'Falha ao limpar estruturas no disconnect');
  }

  // 5) Log
  this.logger?.info(
    { sessionId: player?.sessionId, name: player?.name, userId: user?._id, ip: ws?._ip },
    'Jogador desconectado e removido do mundo'
  );

  // 6) Broadcast imediato do "pl" para o mapa (ATUALIZA A LISTA NO CLIENT)
  try {
    this.broadcastPlayersListToMap?.(player?.mapId);
  } catch {}
}

  /**
   * Envia um pacote diretamente para uma conexão WebSocket
   * 
   * Função de baixo nível que serializa JSON e envia pelo socket.
   * Inclui proteções contra erros e backpressure.
   * 
   * @param {WebSocket} ws - Conexão WebSocket
   * @param {Object} obj - Objeto a ser enviado (será convertido para JSON)
   * 
   * Proteções:
   * - Verifica se conexão está aberta (readyState === 1)
   * - Verifica backpressure (buffer não muito cheio)
   * - Captura e loga erros de envio
   */
  sendRaw(ws, obj) {
    // Só envia se conexão está OPEN (readyState 1)
    if (ws.readyState !== 1) return;

    try {
      // Backpressure guard - se buffer tem mais de 1MB, pula
      // Isso previne acumular mensagens se cliente está lento
      if (ws.bufferedAmount > 1_000_000) return;

      // Serializa para JSON e envia
      ws.send(JSON.stringify(obj));
    } catch (err) {
      this.logger.warn({ err: String(err) }, 'Erro ao enviar pacote');
    }
  }

  /**
   * Envia pacote para um jogador específico
   * 
   * Encontra a conexão WebSocket do jogador e envia o pacote.
   * 
   * @param {Object} player - Jogador que deve receber
   * @param {Object} obj - Objeto a enviar
   */
  sendTo(player, obj) {
    // Procura a sessão deste jogador
    for (const [ws, session] of this.sessions) {
      if (session.player === player) {
        this.sendRaw(ws, obj);
        return;
      }
    }
  }

  /**
   * Envia pacote para outros jogadores no mesmo mapa
   * 
   * Envia para todos no mesmo mapa EXCETO o próprio jogador.
   * Usado para notificar outros sobre ações do jogador (movimento, etc).
   * 
   * @param {Object} player - Jogador que NÃO deve receber
   * @param {Object} obj - Objeto a enviar
   */
  sendToOthersInMap(player, obj) {
    for (const [ws, session] of this.sessions) {
      // Verifica se está no mesmo mapa E não é o próprio jogador
      if (session.player.mapId === player.mapId && session.player !== player) {
        this.sendRaw(ws, obj);
      }
    }
  }

  /**
   * Broadcast para todos em um mapa específico
   * 
   * IMPORTANTE: Se o pacote é um snapshot 'p', não envia para o jogador
   * que é dono do snapshot (evita "snapback" - jogador receber sua própria posição).
   * 
   * @param {string} mapId - ID do mapa
   * @param {Object} obj - Objeto a enviar
   */
  broadcastInMap(mapId, obj) {
    for (const [ws, session] of this.sessions) {
      // Pula se não está neste mapa
      if (session.player.mapId !== mapId) continue;

      // Proteção anti-snapback: se for snapshot 'p', não envia para o próprio jogador
      if (obj && obj.type === 'p') {
        if (String(session.player.sessionId) === String(obj.id)) {
          continue;  // Pula o próprio jogador
        }
      }

      this.sendRaw(ws, obj);
    }
  }

  /**
   * Obtém todos os jogadores em um mapa
   * 
   * @param {string} mapId - ID do mapa
   * @returns {Array<Object>} Array de objetos player
   */
  getPlayersInMap(mapId) {
    const list = [];
    for (const p of this.players.values()) {
      if (p.mapId === mapId) list.push(p);
    }
    return list;
  }

  /**
   * Sincroniza presença de jogadores
   * 
   * Chamado quando um novo jogador entra em um mapa.
   * Garante que todos os jogadores se vejam mutuamente:
   * 
   * 1. Notifica jogadores existentes sobre o novo jogador
   * 2. Notifica o novo jogador sobre os jogadores existentes
   * 
   * Para cada jogador, envia:
   * - Template (plr_tpl): aparência visual (sprites, cores)
   * - Snapshot (p): posição atual e estado
   * 
   * @param {Object} newPlayer - Jogador que acabou de entrar
   */
  syncPresence(newPlayer) {
    // Obtém todos os jogadores no mesmo mapa
    const sameMap = this.getPlayersInMap(newPlayer.mapId);

    // 1) Notifica outros sobre o novo jogador
    const newTpl = this.playerService.makePlayerTemplatePacket(newPlayer);
    const newSnap = this.playerService.makePlayerSnapshotPacket(newPlayer);
    for (const p of sameMap) {
      if (p === newPlayer) continue;  // Pula o próprio
      this.sendTo(p, newTpl);         // Envia template do novo
      this.sendTo(p, newSnap);        // Envia snapshot do novo
    }

    // 2) Envia ao novo os jogadores já presentes
    for (const p of sameMap) {
      if (p === newPlayer) continue;  // Pula o próprio
      this.sendTo(newPlayer, this.playerService.makePlayerTemplatePacket(p));
      this.sendTo(newPlayer, this.playerService.makePlayerSnapshotPacket(p));
    }
  }

  /**
   * Broadcast para todos os jogadores conectados
   * 
   * Usado para mensagens globais (chat global, anúncios, etc).
   * 
   * @param {Object} obj - Objeto a enviar
   */
  broadcastAll(obj) {
    for (const [ws] of this.sessions) this.sendRaw(ws, obj);
  }
}