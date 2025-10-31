import { MapService } from '../services/mapService.js';
import { PlayerService } from '../services/playerService.js';
import { ChatService } from '../services/chatService.js';

export class World {
  constructor(env, logger) {
    this.env = env;
    this.logger = logger;

    this.mapService = new MapService(env, logger);
    this.sessions = new Map(); // ws -> { ws, user, player }
    this.players = new Map();  // sessionId -> player

    this.playerService = new PlayerService(env, logger, this);
    this.chatService = new ChatService(env, logger, this);

    this._nextSessionId = 1000;
    this._tickTimer = null;
    this._lastTickAt = Date.now();
  }

  async init() {
    await this.mapService.loadAll();
    this.startGameLoop();
  }

  startGameLoop() {
    const TICK_MS = Number(this.env.TICK_MS || 50);
    if (this._tickTimer) clearInterval(this._tickTimer);
    this._lastTickAt = Date.now();

    this._tickTimer = setInterval(() => {
      const now = Date.now();
      const dt = now - this._lastTickAt;
      this._lastTickAt = now;

      for (const player of this.players.values()) {
        this.playerService.tickPlayer(player, dt);
      }
    }, TICK_MS);
    this.logger.info({ TICK_MS }, 'Game loop iniciado');
  }

  async shutdown() {
    if (this._tickTimer) clearInterval(this._tickTimer);
    for (const [ws, session] of this.sessions) {
      try {
        this.playerService.stopMoving(session.player);
        await this.playerService.persistPosition(session.player);
      } catch {}
      try { ws.close(); } catch {}
    }
    this.sessions.clear();
    this.players.clear();
  }

  attachSession(ws, { user, player }) {
    const sessionId = String(this._nextSessionId++);
    player.sessionId = sessionId;
    player.name = player.name || user.username;
    player.level = player.level || this.env.DEFAULT_LEVEL;

    // Movimento
    player.speed = player.speed || 750; // ms/tile
    player.moving = false;
    player._accumMs = 0;
    player.dir = Number.isInteger(player.dir) ? player.dir : 0;

    // Viewport / rede
    player._lastViewOX = undefined;
    player._lastViewOY = undefined;
    player._viewDirty = false;
    player._lastMapAt = 0;
    player._snapshotDirty = false;
    player._lastSnapshotAt = 0;

    const session = { ws, user, player };
    this.sessions.set(ws, session);
    this.players.set(sessionId, player);

    this.logger.info({ user: user.username, sessionId, mapId: player.mapId }, 'Sessão anexada');
  }

  getSession(ws) {
    return this.sessions.get(ws);
  }

  handleDisconnect(ws) {
    const session = this.sessions.get(ws);
    if (!session) return;
    const { player, user } = session;

    this.playerService.stopMoving(player);
    this.playerService.persistPosition(player).catch(() => {});
    this.players.delete(String(player.sessionId));
    this.sessions.delete(ws);
    this.logger.info({ user: user.username, id: player.sessionId }, 'Sessão desconectada');
  }

  sendRaw(ws, obj) {
    if (ws.readyState !== 1) return;
    try {
      // Backpressure guard
      if (ws.bufferedAmount > 1_000_000) return;
      ws.send(JSON.stringify(obj));
    } catch (err) {
      this.logger.warn({ err: String(err) }, 'Erro ao enviar pacote');
    }
  }

  // Envia para o próprio player
  sendTo(player, obj) {
    for (const [ws, session] of this.sessions) {
      if (session.player === player) {
        this.sendRaw(ws, obj);
        return;
      }
    }
  }

  // Envia para os outros no mesmo mapa (não ao próprio)
  sendToOthersInMap(player, obj) {
    for (const [ws, session] of this.sessions) {
      if (session.player.mapId === player.mapId && session.player !== player) {
        this.sendRaw(ws, obj);
      }
    }
  }

  // Compatibilidade: alguns trechos antigos chamam broadcastInMap(mapId, obj).
  // Implementamos de forma segura: se for snapshot "p", não envia para o próprio jogador
  // (evita snapback). Para outros tipos, envia para todos no mapa.
  broadcastInMap(mapId, obj) {
    for (const [ws, session] of this.sessions) {
      if (session.player.mapId !== mapId) continue;

      // Evitar snapback: se for "p", não envie para o próprio jogador
      if (obj && obj.type === 'p') {
        if (String(session.player.sessionId) === String(obj.id)) {
          continue;
        }
      }
      this.sendRaw(ws, obj);
    }
  }

  // Utilitário: obter todos players em um mapa
  getPlayersInMap(mapId) {
    const list = [];
    for (const p of this.players.values()) {
      if (p.mapId === mapId) list.push(p);
    }
    return list;
  }

  // Faz os players se verem (templates + snapshots iniciais)
  syncPresence(newPlayer) {
    const sameMap = this.getPlayersInMap(newPlayer.mapId);

    // 1) Notifica outros sobre o novo
    const newTpl = this.playerService.makePlayerTemplatePacket(newPlayer);
    const newSnap = this.playerService.makePlayerSnapshotPacket(newPlayer);
    for (const p of sameMap) {
      if (p === newPlayer) continue;
      this.sendTo(p, newTpl);
      this.sendTo(p, newSnap);
    }

    // 2) Envia ao novo os já presentes
    for (const p of sameMap) {
      if (p === newPlayer) continue;
      this.sendTo(newPlayer, this.playerService.makePlayerTemplatePacket(p));
      this.sendTo(newPlayer, this.playerService.makePlayerSnapshotPacket(p));
    }
  }

  broadcastAll(obj) {
    for (const [ws] of this.sessions) this.sendRaw(ws, obj);
  }
}