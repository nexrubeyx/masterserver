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
import { findUserByUsername, createUser, ensureUserPermissionDefault, checkAndUpdatePremium } from '../models/User.js';
import { createPlayer, getPlayerByUserId } from '../models/Player.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { DEFAULT_ATTACK_SPEED } from '../constants/tiles.js';

// Número de rounds do bcrypt para hashing de senhas
// Maior = mais seguro mas mais lento (10 é um bom balanço)
const SALT_ROUNDS = 10;

/**
 * Processa login ou criação de conta
 * 
 * @param {Object} env - Configurações do ambiente (defaults de personagem)
 * @param {Object} logger - Logger para registrar eventos
 * @param {Object} world - Instância do World para verificar jogadores dormindo
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
export async function handleLoginOrCreate(env, logger, world, payload) {
  // === FLUXO GUEST ===
  // Cria conta temporária sem senha
  if (payload.type === 'guest') {
    // Gera nome aleatório: guest-abc123
    const guestName = `guest-${Math.random().toString(36).slice(2, 8)}`;
    
    return await ensurePlayer(env, logger, world, {
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
    return await ensurePlayer(env, logger, world, {
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
    return await ensurePlayer(env, logger, world, {
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
 * @param {Object} world - Instância do World para verificar jogadores dormindo
 * @param {Object} params - Dados do usuário
 * @returns {Promise<Object>} { user, player, created }
 * 
 * Se o personagem já existe, retorna ele.
 * Se não existe, cria um novo com aparência padrão.
 * 
 * Esta função é usada tanto para novos usuários quanto para
 * usuários existentes que ainda não têm personagem.
 */
async function ensurePlayer(env, logger, world, { username, isGuest, email, userDoc }) {
  // Se não tem userDoc (guests), cria um stub temporário
  if (!userDoc) {
    userDoc = { _id: `guest:${username}`, username, email: null, premium: 0 };
  }
  
  // === VERIFICAÇÃO DE JOGADOR DORMINDO ===
  // Se este usuário tem um jogador dormindo, cancela o timer e reutiliza o jogador
  // Isso previne a criação de personagem duplicado quando o jogador reconecta
  // antes do timer de 60 segundos expirar
  if (world && world.sleepingPlayers) {
    for (const [sessionId, sleepData] of world.sleepingPlayers) {
      if (String(sleepData.user?._id) === String(userDoc?._id)) {
        // Cancela o timer de desconexão
        if (sleepData.timeoutId) {
          clearTimeout(sleepData.timeoutId);
        }
        
        // Remove do mapa de sleeping
        world.sleepingPlayers.delete(sessionId);
        
        // Reutiliza o jogador dormindo (mantém posição e estado)
        const wakingPlayer = sleepData.player;
        wakingPlayer.sleeping = false;
        
        // Marca que este jogador está acordando do sleep para mostrar mensagem
        wakingPlayer._wasWakingFromSleep = true;
        
        // Atualiza informação de premium
        if (userDoc._id && typeof userDoc._id === 'object') {
          const premiumDays = await checkAndUpdatePremium(userDoc._id);
          userDoc.premium = premiumDays;
          wakingPlayer.premium = premiumDays;
        }
        
        // Log
        logger?.info(
          { sessionId, name: wakingPlayer?.name, userId: userDoc?._id },
          'Jogador reconectado durante período de sleep - reutilizando personagem'
        );
        
        // Retorna o jogador dormindo (não cria novo)
        return { user: userDoc, player: wakingPlayer, created: false };
      }
    }
  }
  
  // Garante que o usuário tem permission default (1 = PLAYER)
  // Isso é idempotente - só atualiza se permission não existir
  // Note: Guest users have string IDs (guest:username), real users have MongoDB ObjectIds
  if (userDoc._id && typeof userDoc._id === 'object') {
    // Real MongoDB user (has ObjectId _id, not a string guest ID)
    await ensureUserPermissionDefault(userDoc._id, PERMISSIONS.PLAYER);
    // Atualiza o objeto userDoc em memória se não tinha permission
    if (typeof userDoc.permission !== 'number') {
      userDoc.permission = PERMISSIONS.PLAYER;
    }
    
    // Verifica e atualiza status de premium
    const premiumDays = await checkAndUpdatePremium(userDoc._id);
    userDoc.premium = premiumDays;
  }
  
  // Busca personagem existente para este usuário
  const existingPlayer = await getPlayerByUserId(userDoc._id);
  if (existingPlayer) {
    // Personagem já existe - retorna sem criar novo
    // Define dbId para permitir salvar posição posteriormente
    existingPlayer.dbId = existingPlayer._id;
    // Adiciona informação de premium ao player para acesso rápido
    existingPlayer.premium = userDoc.premium || 0;
    // Garante que attackSpeed existe (para personagens antigos sem este campo)
    if (!Number.isFinite(existingPlayer.attackSpeed)) {
      existingPlayer.attackSpeed = DEFAULT_ATTACK_SPEED;
    }
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
  
  // Adiciona informação de premium ao player para acesso rápido
  player.premium = userDoc.premium || 0;

  // Retorna usuário + personagem criado
  return { user: userDoc, player, created: true };
}