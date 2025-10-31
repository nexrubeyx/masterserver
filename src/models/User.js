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