import fs from 'fs';

export function loadTLSCredentials(env, logger) {
  if (!env.TLS_CERT_PATH || !env.TLS_KEY_PATH) {
    throw new Error('TLS_CERT_PATH e TLS_KEY_PATH devem estar definidos no .env quando TLS_ENABLE=true');
  }
  try {
    const cert = fs.readFileSync(env.TLS_CERT_PATH, 'utf8');
    const key = fs.readFileSync(env.TLS_KEY_PATH, 'utf8');
    return { key, cert };
  } catch (err) {
    logger.error({ err: String(err), cert: env.TLS_CERT_PATH, key: env.TLS_KEY_PATH }, 'Falha ao ler certificados TLS');
    throw err;
  }
}