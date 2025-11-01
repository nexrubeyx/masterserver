/**
 * Serviço de Autenticação - Login, Registro e Criação de Personagens
 * 
 * Este módulo gerencia todo o processo de autenticação:
 * - Login de usuários existentes com credenciais
 * - Criação de novas contas com email
 * - Entrada de visitantes (guest) sem senha
 * - Criação automática de personagem para novos usuários
 * 
 * Fluxos suportados:
 * 1. Guest: cria conta temporária sem senha (guest-XXXXX)
 * 2. Novo usuário: verifica que username não existe, cria conta + personagem
 * 3. Login existente: valida senha e carrega personagem
 * 
 * Segurança:
 * - Senhas são hasheadas com bcrypt (10 rounds)
 * - Credenciais chegam em Base64 e são decodificadas
 * - Nunca armazena senhas em texto puro
 */

import bcrypt from 'bcryptjs';
import { b64decode } from '../utils/base64.js';
import { findUserByUsername, createUser, ensureUserPermissionDefault } from '../models/User.js';
import { createPlayer, getPlayerByUserId } from '../models/Player.js';
import { PERMISSIONS } from '../constants/permissions.js';

// Número de rounds do bcrypt para hashing de senhas
// Maior = mais seguro mas mais lento (10 é um bom balanço)
const SALT_ROUNDS = 10;

/**
 * Processa login ou criação de conta
 * 
 * @param {Object} env - Configurações do ambiente (defaults de personagem)
 * @param {Object} logger - Logger para registrar eventos
 * @param {Object} payload - Mensagem do cliente (tipo 'login' ou 'guest')
 * @returns {Promise<Object>} { user, player, created } onde:
 *   - user: documento do usuário
 *   - player: documento do personagem
 *   - created: true se foi criado agora, false se já existia
 * @throws {Error} Se credenciais inválidas ou usuário não encontrado
 * 
 * Payload tipos:
 * - { type: 'guest' } -> cria guest-XXXXX aleatório
 * - { type: 'login', user, pass, email } -> login ou registro
 */
export async function handleLoginOrCreate(env, logger, payload) {
  // === FLUXO GUEST ===
  // Cria conta temporária sem senha
  if (payload.type === 'guest') {
    // Gera nome aleatório: guest-abc123
    const guestName = `guest-${Math.random().toString(36).slice(2, 8)}`;
    
    return await ensurePlayer(env, logger, {
      username: guestName,
      isGuest: true,
      email: null,
      password: null
    });
  }

  // === FLUXO LOGIN/REGISTRO ===
  
  // Decodifica credenciais de Base64 para texto
  const usernameRaw = b64decode(payload.user || '');
  const passwordRaw = b64decode(payload.pass || '');
  const emailRaw = payload.email ? b64decode(payload.email) : null;

  // Validação básica: precisa ter username e (senha ou email)
  if (!usernameRaw || (!passwordRaw && !emailRaw)) {
    throw new Error('Credenciais inválidas');
  }

  // Busca usuário existente no banco
  const existing = await findUserByUsername(usernameRaw);
  
  // CASO 1: Novo usuário (tem email e não existe)
  if (emailRaw && !existing) {
    // Cria hash da senha com bcrypt
    const passwordHash = await bcrypt.hash(passwordRaw, SALT_ROUNDS);
    
    // Cria nova conta no banco
    const newUser = await createUser({ 
      username: usernameRaw, 
      passwordHash, 
      email: emailRaw 
    });
    
    // Cria personagem para o novo usuário
    return await ensurePlayer(env, logger, {
      username: usernameRaw,
      isGuest: false,
      email: emailRaw,
      userDoc: newUser
    });
  } 
  
  // CASO 2: Usuário existente fazendo login
  else if (existing) {
    // Verifica se a conta tem senha (guests não têm)
    if (!existing.passwordHash) {
      throw new Error('Invalid username or password.');
    }
    
    // Compara senha fornecida com hash armazenado
    const ok = await bcrypt.compare(passwordRaw, existing.passwordHash);
    if (!ok) throw new Error('Invalid username or password.');
    
    // Senha correta - carrega ou cria personagem
    return await ensurePlayer(env, logger, {
      username: existing.username,
      isGuest: false,
      email: existing.email || null,
      userDoc: existing
    });
  } 
  
  // CASO 3: Tentando logar mas usuário não existe e não forneceu email
  else {
    throw new Error('Invalid username or password.');
  }
}

/**
 * Garante que um personagem existe para o usuário
 * 
 * @param {Object} env - Configurações do ambiente
 * @param {Object} logger - Logger
 * @param {Object} params - Dados do usuário
 * @returns {Promise<Object>} { user, player, created }
 * 
 * Se o personagem já existe, retorna ele.
 * Se não existe, cria um novo com aparência padrão.
 * 
 * Esta função é usada tanto para novos usuários quanto para
 * usuários existentes que ainda não têm personagem.
 */
async function ensurePlayer(env, logger, { username, isGuest, email, userDoc }) {
  // Se não tem userDoc (guests), cria um stub temporário
  if (!userDoc) {
    userDoc = { _id: `guest:${username}`, username, email: null };
  }
  
  // Garante que o usuário tem permission default (1 = PLAYER)
  // Isso é idempotente - só atualiza se permission não existir
  if (userDoc._id && typeof userDoc._id === 'object') {
    // É um ObjectId real do MongoDB, não um guest
    await ensureUserPermissionDefault(userDoc._id, PERMISSIONS.PLAYER);
    // Atualiza o objeto userDoc em memória se não tinha permission
    if (typeof userDoc.permission !== 'number') {
      userDoc.permission = PERMISSIONS.PLAYER;
    }
  }
  
  // Busca personagem existente para este usuário
  const existingPlayer = await getPlayerByUserId(userDoc._id);
  if (existingPlayer) {
    // Personagem já existe - retorna sem criar novo
    // Define dbId para permitir salvar posição posteriormente
    existingPlayer.dbId = existingPlayer._id;
    return { user: userDoc, player: existingPlayer, created: false };
  }

  // === CRIAÇÃO DE NOVO PERSONAGEM ===
  
  // Constrói objeto de aparência com valores padrão do .env
  const appearance = {
    body: env.DEFAULT_BODY,              // Sprite do corpo (1 = humano)
    hair: env.DEFAULT_HAIR,              // Estilo do cabelo
    clothes: env.DEFAULT_CLOTHES,        // Estilo da roupa
    hairColor: env.DEFAULT_HAIR_COLOR,   // Cor do cabelo (RGB decimal)
    clothesColor: env.DEFAULT_CLOTHES_COLOR,  // Cor da roupa (RGB decimal)
    eyeColor: env.DEFAULT_EYE_COLOR,     // Cor dos olhos (RGB decimal)
    nameColor: env.DEFAULT_NAME_COLOR,   // Cor do nome sobre a cabeça
    sprite: -1  // -1 indica player "humanoide" (não-monstro) pelo client
  };

  // Cria o personagem no banco de dados
  const player = await createPlayer({
    userId: userDoc._id,           // Vincula ao usuário
    name: username,                // Nome do personagem = username
    mapId: env.DEFAULT_MAP_ID,     // Mapa inicial (ex: 'overworld')
    x: env.DEFAULT_X,              // Posição X inicial (configurável via .env)
    y: env.DEFAULT_Y,              // Posição Y inicial (configurável via .env)
    appearance                     // Aparência visual
  });

  // Define dbId para permitir salvar posição posteriormente
  player.dbId = player._id;

  // Retorna usuário + personagem criado
  return { user: userDoc, player, created: true };
}