import { savePlayerPosition } from '../models/Player.js';

export class PlayerService {
  constructor(env, logger, world) {
    this.env = env;
    this.logger = logger;
    this.world = world;

    this._snapshotMinInterval = 1000 / Number(env.SNAPSHOT_MAX_HZ || 20);
    this._mapMinInterval = 1000 / Number(env.MAP_MAX_HZ || 20);
  }

  makePlayerTemplatePacket(player) {
    return {
      type: 'plr_tpl',
      id: String(player.sessionId),
      n: player.name,
      t: '',
      l: player.level,
      p: player.appearance.nameColor,
      pr: 0,
      s: player.appearance.sprite,
      b: player.appearance.body,
      h: player.appearance.hair,
      hc: player.appearance.hairColor,
      c: player.appearance.clothes,
      cc: player.appearance.clothesColor,
      ec: player.appearance.eyeColor
    };
  }

  makePlayerSnapshotPacket(player) {
    return {
      type: 'p',
      id: String(player.sessionId),
      tpl: String(player.sessionId),
      x: player.x,
      y: player.y,
      s: player.speed || 300,
      d: player.dir || 0,
      ch: 0
    };
  }

  getViewportOrigin(player) {
    const ox = player.x - this.env.MAP_VIEW_RADIUS_X;
    const oy = player.y - this.env.MAP_VIEW_RADIUS_Y;
    return { ox, oy };
  }

  markViewportDirty(player) {
    const { ox, oy } = this.getViewportOrigin(player);
    if (player._lastViewOX !== ox || player._lastViewOY !== oy) {
      player._viewDirty = true;
      player._pendingOX = ox;
      player._pendingOY = oy;
    }
  }

  flushViewportIfDirty(player, now) {
    if (!player._viewDirty) return;
    if (now - (player._lastMapAt || 0) < this._mapMinInterval) return; // respeita taxa

    player._viewDirty = false;
    player._lastViewOX = player._pendingOX;
    player._lastViewOY = player._pendingOY;
    player._lastMapAt = now;

    const map = this.world.mapService.getMap(player.mapId);
    if (!map) return;
    const tiles = this.world.mapService.buildViewportPayload(
      map,
      player.x,
      player.y,
      this.env.MAP_VIEW_RADIUS_X,
      this.env.MAP_VIEW_RADIUS_Y
    );
    this.world.sendTo(player, { type: 'map', x: player.x, y: player.y, tiles });
  }

  markSnapshotDirty(player) {
    player._snapshotDirty = true;
  }

  flushSnapshotIfDirty(player, now) {
    if (!player._snapshotDirty) return;
    if (now - (player._lastSnapshotAt || 0) < this._snapshotMinInterval) return;

    this.world.sendToOthersInMap(player, this.makePlayerSnapshotPacket(player));
    player._lastSnapshotAt = now;
    player._snapshotDirty = false;
  }

  // Tick global com delta: processa múltiplos passos por tick se necessário
  tickPlayer(player, dt) {
    const now = Date.now();

    // 1) flush pendências do tick anterior
    this.flushViewportIfDirty(player, now);
    this.flushSnapshotIfDirty(player, now);

    if (!player.moving) return;

    // 2) simular movimento
    player._accumMs = (player._accumMs || 0) + dt;
    const stepMs = Math.max(20, player.speed || 750);

    let moved = false;
    while (player._accumMs >= stepMs) {
      const map = this.world.mapService.getMap(player.mapId);
      if (!map) break;

      // Calcula o próximo alvo (sem aplicar ainda)
      const dx = (player.dir === 1 ? 1 : player.dir === 3 ? -1 : 0);
      const dy = (player.dir === 2 ? 1 : player.dir === 0 ? -1 : 0);
      const nx = player.x + dx;
      const ny = player.y + dy;

      // Consumimos o tempo deste passo
      player._accumMs -= stepMs;

      // Bordas INACESSÍVEIS: se sairia do mapa, bloqueia o passo e não altera x/y
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) {
        // Não move, não marca viewport, não envia nada.
        break;
      }

      // Passo válido dentro do mapa
      player.x = nx;
      player.y = ny;

      // Se origem mudou, marcar map para envio (coalescido)
      this.markViewportDirty(player);
      moved = true;

      // IMPORTANTE: Sem transições entre mapas — não chamamos checkExitAndTransition
    }

    // 3) Ao final do tick, flush uma vez (coalescido)
    if (moved) {
      this.flushViewportIfDirty(player, now);
      this.markSnapshotDirty(player);
      this.flushSnapshotIfDirty(player, now);
    }
  }

  startMoving(player, dir) {
    if (!Number.isInteger(dir) || dir < 0 || dir > 3) return;
    player.dir = dir;
    player.moving = true;
  }

  stopMoving(player) {
    player.moving = false;
    player._accumMs = 0;
    this.world.sendToOthersInMap(player, this.makePlayerSnapshotPacket(player));
  }

  setHeading(player, dir) {
    if (Number.isInteger(dir)) player.dir = dir;
    this.world.sendToOthersInMap(player, this.makePlayerSnapshotPacket(player));
  }

  async persistPosition(player) {
    if (!player.dbId) return;
    await savePlayerPosition(player.dbId, player.mapId, player.x, player.y);
  }
}