import { getDB } from '../db/mongo.js';

export async function getPlayerByUserId(userId) {
  const db = getDB();
  return db.collection('players').findOne({ userId });
}

export async function createPlayer({ userId, name, mapId, x, y, appearance, speed }) {
  const db = getDB();
  const doc = {
    userId,
    name,
    level: 1,
    mapId,
    x,
    y,
    speed: Number.isFinite(speed) ? speed : undefined, // persiste se informado
    inventory: [],
    appearance,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  const res = await db.collection('players').insertOne(doc);
  return { ...doc, _id: res.insertedId };
}

export async function savePlayerPosition(playerId, mapId, x, y) {
  const db = getDB();
  await db.collection('players').updateOne(
    { _id: playerId },
    { $set: { mapId, x, y, updatedAt: new Date() } }
  );
}

export async function savePlayerInventory(playerId, inventory) {
  const db = getDB();
  await db.collection('players').updateOne(
    { _id: playerId },
    { $set: { inventory, updatedAt: new Date() } }
  );
}