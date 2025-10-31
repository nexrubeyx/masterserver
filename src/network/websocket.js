import { WebSocketServer } from 'ws';
import { validatePacket } from '../protocol/schema.js';
import { createMessageRouter } from '../controllers/messageRouter.js';

export function createWSServer(env, logger, world, attachToServer /* optional httpsServer */) {
  let wss;
  if (attachToServer) {
    wss = new WebSocketServer({
      server: attachToServer,
      maxPayload: env.MAX_PAYLOAD_BYTES
    });
    logger.info({ port: env.TLS_PORT }, 'WSS anexado ao HTTPS server');
  } else {
    wss = new WebSocketServer({
      host: env.SERVER_HOST,
      port: env.SERVER_PORT_WS,
      maxPayload: env.MAX_PAYLOAD_BYTES
    });
    logger.info({ host: env.SERVER_HOST, port: env.SERVER_PORT_WS }, 'WS Server iniciado');
  }

  const router = createMessageRouter(env, logger, world);
  const rateWindow = env.RATE_LIMIT_WINDOW_MS;
  const rateMax = env.RATE_LIMIT_MAX;

  wss.on('connection', (ws, req) => {
    ws._ip = req.socket.remoteAddress;
    ws._rate = [];
    ws._alive = true;

    ws.on('message', (buf) => {
      // Rate limit de entrada (mensagens do client)
      const now = Date.now();
      ws._rate = ws._rate.filter((t) => now - t < rateWindow);
      ws._rate.push(now);
      if (ws._rate.length > rateMax) {
        // Em vez de fechar, apenas ignore se quiser ser mais tolerante:
        // return;
        ws.close(1008, 'Rate limit');
        return;
      }

      let data = null;
      try {
        if (buf.length > env.MAX_PAYLOAD_BYTES) throw new Error('Payload too large');
        data = JSON.parse(buf.toString('utf8'));
      } catch {
        ws.close(1003, 'Invalid JSON');
        return;
      }

      const v = validatePacket(data);
      if (!v.ok) return;

      router(ws, data).catch((err) => {
        logger.warn({ err: String(err) }, 'Erro no roteador');
      });
    });

    ws.on('pong', () => { ws._alive = true; });
    ws.on('close', () => { world.handleDisconnect(ws); });
  });

  // heartbeats
  const iv = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws._alive === false) {
        ws.terminate();
        return;
      }
      ws._alive = false;
      try { ws.ping(); } catch {}
    });
  }, 15000);

  wss.on('close', () => clearInterval(iv));
  return wss;
}