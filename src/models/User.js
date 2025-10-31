import { getDB } from '../db/mongo.js';

export async function findUserByUsername(username) {
  const db = getDB();
  return db.collection('users').findOne({ username });
}

export async function createUser({ username, passwordHash, email }) {
  const db = getDB();
  const doc = { username, passwordHash, email: email || null, createdAt: new Date() };
  const res = await db.collection('users').insertOne(doc);
  return { ...doc, _id: res.insertedId };
}