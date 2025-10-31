import bcrypt from 'bcryptjs';
import { b64decode } from '../utils/base64.js';
import { findUserByUsername, createUser } from '../models/User.js';
import { createPlayer, getPlayerByUserId } from '../models/Player.js';

const SALT_ROUNDS = 10;

export async function handleLoginOrCreate(env, logger, payload) {
  // payload: {type:'login', user, pass, email?} OU {type:'guest'}
  if (payload.type === 'guest') {
    const guestName = `guest-${Math.random().toString(36).slice(2, 8)}`;
    return await ensurePlayer(env, logger, {
      username: guestName,
      isGuest: true,
      email: null,
      password: null
    });
  }

  const usernameRaw = b64decode(payload.user || '');
  const passwordRaw = b64decode(payload.pass || '');
  const emailRaw = payload.email ? b64decode(payload.email) : null;

  if (!usernameRaw || (!passwordRaw && !emailRaw)) {
    throw new Error('Credenciais inválidas');
  }

  const existing = await findUserByUsername(usernameRaw);
  if (emailRaw && !existing) {
    // criar conta
    const passwordHash = await bcrypt.hash(passwordRaw, SALT_ROUNDS);
    const newUser = await createUser({ username: usernameRaw, passwordHash, email: emailRaw });
    return await ensurePlayer(env, logger, {
      username: usernameRaw,
      isGuest: false,
      email: emailRaw,
      userDoc: newUser
    });
  } else if (existing) {
    if (!existing.passwordHash) {
      // conta convidado tentando logar com senha não existe
      throw new Error('Conta de convidado não possui senha');
    }
    const ok = await bcrypt.compare(passwordRaw, existing.passwordHash);
    if (!ok) throw new Error('Senha inválida');
    return await ensurePlayer(env, logger, {
      username: existing.username,
      isGuest: false,
      email: existing.email || null,
      userDoc: existing
    });
  } else {
    throw new Error('Usuário não encontrado');
  }
}

async function ensurePlayer(env, logger, { username, isGuest, email, userDoc }) {
  // se userDoc não existir e for guest, criamos só player com user stub (sem senha)
  if (!userDoc) {
    userDoc = { _id: `guest:${username}`, username, email: null };
  }
  const existingPlayer = await getPlayerByUserId(userDoc._id);
  if (existingPlayer) {
    return { user: userDoc, player: existingPlayer, created: false };
  }

  const appearance = {
    body: env.DEFAULT_BODY,
    hair: env.DEFAULT_HAIR,
    clothes: env.DEFAULT_CLOTHES,
    hairColor: env.DEFAULT_HAIR_COLOR,
    clothesColor: env.DEFAULT_CLOTHES_COLOR,
    eyeColor: env.DEFAULT_EYE_COLOR,
    nameColor: env.DEFAULT_NAME_COLOR,
    sprite: -1 // -1 indica player "humanoide" (não-monstro) pelo client
  };

  const player = await createPlayer({
    userId: userDoc._id,
    name: username,
    mapId: env.DEFAULT_MAP_ID,
    x: 10,
    y: 10,
    appearance
  });

  return { user: userDoc, player, created: true };
}