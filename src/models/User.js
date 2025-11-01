/**
 * Model de Usuário - Gerenciamento de Contas
 * 
 * Este módulo contém funções para gerenciar contas de usuários no banco de dados.
 * Cada usuário possui credenciais de login e pode ter um personagem (player) associado.
 * 
 * Estrutura do documento User na coleção 'users':
 * {
 *   _id: ObjectId,              // ID único gerado pelo MongoDB
 *   username: string,           // Nome de usuário (único, indexado)
 *   passwordHash: string,       // Hash bcrypt da senha
 *   email: string | null,       // Email (opcional, usado no registro)
 *   createdAt: Date             // Data de criação da conta
 * }
 */

import { getDB } from '../db/mongo.js';

/**
 * Busca um usuário pelo nome de usuário
 * 
 * @param {string} username - Nome de usuário a buscar
 * @returns {Promise<Object|null>} Documento do usuário ou null se não encontrado
 * 
 * Usado durante o login para verificar se o usuário existe e
 * obter o hash da senha para comparação.
 */
export async function findUserByUsername(username) {
  const db = getDB();
  return db.collection('users').findOne({ username });
}

/**
 * Cria uma nova conta de usuário no banco de dados
 * 
 * @param {Object} params - Dados do novo usuário
 * @param {string} params.username - Nome de usuário (único)
 * @param {string} params.passwordHash - Hash bcrypt da senha
 * @param {string} params.email - Email do usuário (pode ser null para guests)
 * @returns {Promise<Object>} Documento do usuário criado (incluindo _id gerado)
 * 
 * Importante:
 * - O username deve ser único (garantido por índice no MongoDB)
 * - A senha já deve vir hasheada (nunca armazene senhas em texto puro)
 * - Guests podem não ter email
 */
export async function createUser({ username, passwordHash, email }) {
  const db = getDB();
  
  // Cria o documento do usuário com timestamp
  const doc = { 
    username,           // Nome de usuário
    passwordHash,       // Hash da senha (bcrypt)
    email: email || null, // Email ou null
    createdAt: new Date() // Data de criação
  };
  
  // Insere no banco de dados
  const res = await db.collection('users').insertOne(doc);
  
  // Retorna o documento com o _id gerado pelo MongoDB
  return { ...doc, _id: res.insertedId };
}

/**
 * Define/atualiza o nível de permissão de um usuário
 * 
 * @param {string} userId - ID do usuário (_id)
 * @param {number} level - Nível de permissão (1=PLAYER, 2=CM, 3=GM, 4=MASTER)
 * @returns {Promise<void>}
 * 
 * Usado por administradores para promover/rebaixar usuários.
 */
export async function setUserPermission(userId, level) {
  const db = getDB();
  await db.collection('users').updateOne(
    { _id: userId },
    { $set: { permission: level, updatedAt: new Date() } }
  );
}

/**
 * Garante que o usuário tenha um permission default se não tiver ainda
 * 
 * @param {string} userId - ID do usuário (_id)
 * @param {number} defaultLevel - Nível padrão a definir (geralmente 1 = PLAYER)
 * @returns {Promise<void>}
 * 
 * Esta função só atualiza usuários que NÃO têm o campo permission.
 * Usada para garantir retrocompatibilidade com usuários antigos.
 */
export async function ensureUserPermissionDefault(userId, defaultLevel) {
  const db = getDB();
  await db.collection('users').updateOne(
    { _id: userId, permission: { $exists: false } },
    { $set: { permission: defaultLevel, updatedAt: new Date() } }
  );
}

/**
 * Obtém usuário pelo ID
 * 
 * @param {string} userId - ID do usuário (_id)
 * @returns {Promise<Object|null>} Documento do usuário ou null
 * 
 * Útil quando precisamos buscar um usuário específico por ID.
 */
export async function getUserById(userId) {
  const db = getDB();
  return db.collection('users').findOne({ _id: userId });
}