import { handleLoginOrCreate } from '../services/authService.js';

export function createMessageRouter(env, logger, world) {
  return async (ws, packet) => {
    switch (packet.type) {
      case 'client': {
        ws._clientInfo = { version: packet.ver, mobile: !!packet.mobile, agent: packet.agent };
        return;
      }

      case 'login':
      case 'guest': {
        try {
          const auth = await handleLoginOrCreate(env, logger, packet);
          world.attachSession(ws, { user: auth.user, player: auth.player });
        } catch (err) {
          world.sendRaw(ws, { type: 'logmsg', text: String(err.message || err) });
          return;
        }
        const { player } = world.getSession(ws);
        const m = world.mapService.getMap(player.mapId);

        // accepted
        world.sendRaw(ws, {
          type: 'accepted',
          id: String(player.sessionId),
          name: player.name,
          mw: m.width,
          mh: m.height,
          tile: {}
        });

        // plr_tpl + p (para o próprio)
        world.sendTo(player, world.playerService.makePlayerTemplatePacket(player));
        world.sendTo(player, world.playerService.makePlayerSnapshotPacket(player));

        // mt + primeiro chunk + música
        world.sendTo(player, {
          type: 'mt',
          s: 1,
          m: env.DEFAULT_SONG,
          w: m.width,
          h: m.height,
          t: m.title || m.id,
          n: m.id,
          c: env.DEFAULT_CAVE_WALL,
          f: env.DEFAULT_CAVE_FLOOR
        });

        // Força primeiro viewport
        player._lastViewOX = undefined;
        player._lastViewOY = undefined;
        world.playerService.markViewportDirty(player);
        world.playerService.flushViewportIfDirty(player, Date.now());

        // Inventário e música
        world.sendTo(player, { type: 'inv', data: [] });
        world.sendTo(player, { type: 'music', m: env.DEFAULT_SONG, s: 0 });

        // >>> CRÍTICO: anuncia presença para todos os lados
        world.syncPresence(player);

        return;
      }

      case 'chat': {
        const session = world.getSession(ws);
        if (!session) return;
        world.chatService.handleChat(session.player, packet.data);
        return;
      }

      case 'm': {
        const session = world.getSession(ws);
        if (!session) return;
        world.playerService.setHeading(session.player, packet.d);
        return;
      }

      case 'h': {
        const session = world.getSession(ws);
        if (!session) return;
        if (Number.isInteger(packet.d)) {
          world.playerService.startMoving(session.player, packet.d);
        } else {
          world.playerService.stopMoving(session.player);
        }
        return;
      }

      case 'P': {
        world.sendRaw(ws, { type: 'P' });
        return;
      }

      default:
        return;
    }
  };
}