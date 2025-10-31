import dotenv from 'dotenv';

export function loadEnv() {
  dotenv.config();

  const required = ['MONGODB_URI', 'MONGODB_DB', 'SERVER_HOST', 'SERVER_PORT_WS'];
  for (const k of required) {
    if (!process.env[k]) {
      throw new Error(`Variável de ambiente ausente: ${k}`);
    }
  }

  const env = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    SERVER_NAME: process.env.SERVER_NAME || 'ML Compatible Server',
    SERVER_HOST: process.env.SERVER_HOST,
    SERVER_PORT_WS: parseInt(process.env.SERVER_PORT_WS, 10),
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB: process.env.MONGODB_DB,
    MAX_PAYLOAD_BYTES: parseInt(process.env.MAX_PAYLOAD_BYTES || '65536', 10),
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '10000', 10),
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '200', 10),

    DEFAULT_MAP_ID: process.env.DEFAULT_MAP_ID || 'overworld',
    MAP_VIEW_RADIUS_X: parseInt(process.env.MAP_VIEW_RADIUS_X || '18', 10),
    MAP_VIEW_RADIUS_Y: parseInt(process.env.MAP_VIEW_RADIUS_Y || '13', 10),
    DEFAULT_SONG: process.env.DEFAULT_SONG || 'rpgtitle',

    DEFAULT_BODY: parseInt(process.env.DEFAULT_BODY || '1', 10),
    DEFAULT_HAIR: parseInt(process.env.DEFAULT_HAIR || '1', 10),
    DEFAULT_CLOTHES: parseInt(process.env.DEFAULT_CLOTHES || '1', 10),
    DEFAULT_HAIR_COLOR: parseInt(process.env.DEFAULT_HAIR_COLOR || '6504471', 10),
    DEFAULT_CLOTHES_COLOR: parseInt(process.env.DEFAULT_CLOTHES_COLOR || '14540253', 10),
    DEFAULT_EYE_COLOR: parseInt(process.env.DEFAULT_EYE_COLOR || '255', 10),
    DEFAULT_NAME_COLOR: parseInt(process.env.DEFAULT_NAME_COLOR || '15724527', 10),
    DEFAULT_LEVEL: parseInt(process.env.DEFAULT_LEVEL || '1', 10),
    DEFAULT_CAVE_WALL: parseInt(process.env.DEFAULT_CAVE_WALL || '112', 10),
    DEFAULT_CAVE_FLOOR: parseInt(process.env.DEFAULT_CAVE_FLOOR || '19', 10),

    CLIENT_VERSION: process.env.CLIENT_VERSION || '5.1.2',

    // Velocidade padrão (ms por tile)
    DEFAULT_SPEED_MS: parseInt(process.env.DEFAULT_SPEED_MS || '750', 10),

    // TLS (se aplicável)
    TLS_ENABLE: String(process.env.TLS_ENABLE || 'false').toLowerCase() === 'true',
    TLS_CERT_PATH: process.env.TLS_CERT_PATH || '',
    TLS_KEY_PATH: process.env.TLS_KEY_PATH || '',
    TLS_PORT: parseInt(process.env.TLS_PORT || '443', 10),
    HTTP_REDIRECT_ENABLE: String(process.env.HTTP_REDIRECT_ENABLE || 'false').toLowerCase() === 'true',
    HTTP_REDIRECT_PORT: parseInt(process.env.HTTP_REDIRECT_PORT || '80', 10),

    // Loop e limites
    TICK_MS: parseInt(process.env.TICK_MS || '50', 10),
    SNAPSHOT_MAX_HZ: parseInt(process.env.SNAPSHOT_MAX_HZ || '20', 10),
    MAP_MAX_HZ: parseInt(process.env.MAP_MAX_HZ || '20', 10)
  };

  return env;
}