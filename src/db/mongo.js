import { MongoClient } from 'mongodb';

let client = null;
let db = null;

export async function connectMongo(env, logger) {
  if (client) return db;
  client = new MongoClient(env.MONGODB_URI, {
    maxPoolSize: 20,
    connectTimeoutMS: 15000
  });
  await client.connect();
  db = client.db(env.MONGODB_DB);
  logger.info({ db: env.MONGODB_DB }, 'Mongo conectado');
  await ensureIndexes();
  return db;
}

export function getDB() {
  if (!db) throw new Error('DB não conectado');
  return db;
}

export async function ensureIndexes() {
  const db = getDB();
  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  await db.collection('players').createIndex({ userId: 1 }, { unique: true });
}