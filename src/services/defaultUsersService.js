/**
 * Default Users Service - Inicialização de Usuários Padrão
 * 
 * Este módulo é responsável por criar usuários padrão (admin, tester, etc)
 * automaticamente quando o servidor inicia, caso eles não existam.
 * 
 * Os usuários são configurados no arquivo defaultUsers.json e incluem:
 * - username: Nome de usuário
 * - password: Senha em texto plano (será hasheada com bcrypt)
 * - email: Email do usuário
 * - permission: Nível de permissão (1=PLAYER, 2=CM, 3=GM, 4=MASTER)
 * 
 * Este processo é idempotente - se o usuário já existe, ele não é recriado.
 */

import bcrypt from 'bcryptjs';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { findUserByUsername, createUser, setUserPermission, addPremiumDays } from '../models/User.js';
import { createPlayer } from '../models/Player.js';

// Determina o diretório atual do módulo
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Número de rounds do bcrypt para hashing de senhas
const SALT_ROUNDS = 10;

/**
 * Inicializa usuários padrão do sistema
 * 
 * @param {Object} env - Configurações do ambiente (para defaults de personagem)
 * @param {Object} logger - Logger para registrar eventos
 * @returns {Promise<void>}
 * 
 * Lê o arquivo defaultUsers.json e cria cada usuário se não existir.
 * Para cada usuário criado, também cria um personagem inicial.
 */
export async function initializeDefaultUsers(env, logger) {
  try {
    // Lê o arquivo de configuração de usuários padrão
    const configPath = join(__dirname, '../config/defaultUsers.json');
    const configData = await readFile(configPath, 'utf-8');
    const defaultUsers = JSON.parse(configData);

    logger.info(`Verificando ${defaultUsers.length} usuários padrão...`);

    // Processa cada usuário definido no JSON
    for (const userConfig of defaultUsers) {
      await ensureDefaultUser(env, logger, userConfig);
    }

    logger.info('Inicialização de usuários padrão concluída');
  } catch (error) {
    // Se o arquivo não existe ou há erro no JSON, apenas avisa
    // O servidor pode funcionar sem usuários padrão
    logger.warn({ error: error.message }, 'Não foi possível inicializar usuários padrão');
  }
}

/**
 * Garante que um usuário padrão existe no sistema
 * 
 * @param {Object} env - Configurações do ambiente
 * @param {Object} logger - Logger
 * @param {Object} userConfig - Configuração do usuário { username, password, email, permission }
 * @returns {Promise<void>}
 * 
 * Se o usuário já existe, apenas verifica/atualiza a permissão.
 * Se não existe, cria o usuário com hash de senha e personagem inicial.
 */
async function ensureDefaultUser(env, logger, userConfig) {
  const { username, password, email, permission, premium } = userConfig;

  // Verifica se o usuário já existe
  const existingUser = await findUserByUsername(username);

  if (existingUser) {
    // Usuário já existe - apenas atualiza permissão e premium se necessário
    if (existingUser.permission !== permission) {
      await setUserPermission(existingUser._id, permission);
      logger.info({ username, permission }, 'Permissão do usuário padrão atualizada');
    }
    
    // Atualiza premium se especificado no config
    if (premium && premium > 0) {
      await addPremiumDays(existingUser._id, premium);
      logger.info({ username, premium }, 'Premium do usuário padrão atualizado');
    }
    
    if (existingUser.permission === permission) {
      logger.debug({ username }, 'Usuário padrão já existe');
    }
    return;
  }

  // Usuário não existe - criar novo
  logger.info({ username, permission }, 'Criando usuário padrão...');

  // Hash da senha com bcrypt
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Cria o usuário no banco de dados
  const newUser = await createUser({
    username,
    passwordHash,
    email: email || null
  });

  // Define a permissão do usuário
  await setUserPermission(newUser._id, permission);

  // Define premium se especificado no config
  if (premium && premium > 0) {
    await addPremiumDays(newUser._id, premium);
    logger.info({ username, premium }, 'Premium configurado para usuário padrão');
  }

  // Cria personagem inicial para o usuário
  const appearance = {
    body: env.DEFAULT_BODY,
    hair: env.DEFAULT_HAIR,
    clothes: env.DEFAULT_CLOTHES,
    hairColor: env.DEFAULT_HAIR_COLOR,
    clothesColor: env.DEFAULT_CLOTHES_COLOR,
    eyeColor: env.DEFAULT_EYE_COLOR,
    nameColor: env.DEFAULT_NAME_COLOR,
    sprite: -1
  };

  await createPlayer({
    userId: newUser._id,
    name: username,
    mapId: env.DEFAULT_MAP_ID,
    x: env.DEFAULT_X,
    y: env.DEFAULT_Y,
    appearance
  });

  logger.info({ username, permission }, 'Usuário padrão criado com sucesso');
}
