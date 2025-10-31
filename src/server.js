import { loadEnv } from './config/env.js';
import { connectMongo } from './db/mongo.js';
import { createLogger } from './logger.js';
import { createWSServer } from './network/websocket.js';
import { World } from './state/world.js';
import http from 'http';
import https from 'https';
import { loadTLSCredentials } from './config/tls.js';

async function main() {
  const env = loadEnv();
  const logger = createLogger();

  await connectMongo(env, logger);

  const world = new World(env, logger);
  await world.init();

  let httpsServer = null;

  if (env.TLS_ENABLE) {
    const creds = loadTLSCredentials(env, logger);
    httpsServer = https.createServer({
      key: creds.key,
      cert: creds.cert
      // Se quiser SNI ou múltiplos domínios, aqui dá para usar SNICallback com tls.createSecureContext
    });

    // Saúde simples (opcional)
    httpsServer.on('request', (req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end('ok');
      } else {
        // Para WSS não precisa servir conteúdo; o upgrade é tratado pelo ws.
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('Not Found');
      }
    });

    httpsServer.listen(env.TLS_PORT, env.SERVER_HOST, () => {
      logger.info({ host: env.SERVER_HOST, port: env.TLS_PORT }, 'HTTPS/WSS (TLS) iniciado');
    });

    // Anexa WSS ao HTTPS server
    createWSServer(env, logger, world, httpsServer);
  } else {
    // Modo WS sem TLS
    createWSServer(env, logger, world);
  }

  // HTTP -> HTTPS redirect (opcional)
  let httpRedirectServer = null;
  if (env.HTTP_REDIRECT_ENABLE && env.TLS_ENABLE) {
    httpRedirectServer = http.createServer((req, res) => {
      const host = req.headers.host || '';
      const location = `https://${host}${req.url || '/'}`;
      res.writeHead(301, { Location: location });
      res.end();
    });
    httpRedirectServer.listen(env.HTTP_REDIRECT_PORT, env.SERVER_HOST, () => {
      logger.info({ host: env.SERVER_HOST, port: env.HTTP_REDIRECT_PORT }, 'HTTP redirect ativo');
    });
  }

  process.on('SIGINT', async () => {
    logger.info('Encerrando servidor (SIGINT)...');
    try { httpsServer?.close(); } catch {}
    try { httpRedirectServer?.close(); } catch {}
    await world.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Encerrando servidor (SIGTERM)...');
    try { httpsServer?.close(); } catch {}
    try { httpRedirectServer?.close(); } catch {}
    await world.shutdown();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Erro fatal ao iniciar:', err);
  process.exit(1);
});