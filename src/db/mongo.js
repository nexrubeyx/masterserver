/**
 * Conexão com MongoDB - Gerenciamento do Banco de Dados
 * 
 * Este módulo gerencia a conexão com o MongoDB e criação de índices necessários.
 * Usa o padrão Singleton para garantir uma única instância de conexão compartilhada
 * por toda a aplicação.
 * 
 * Coleções do banco:
 * - users: Armazena contas de usuários (username, senha hash, email)
 * - players: Armazena personagens dos jogadores (posição, aparência, inventário)
 */

import { MongoClient } from 'mongodb';

// Variáveis globais para manter a conexão singleton
let client = null;  // Cliente MongoDB
let db = null;      // Instância do banco de dados

/**
 * Conecta ao MongoDB e configura índices
 * 
 * @param {Object} env - Configurações contendo MONGODB_URI e MONGODB_DB
 * @param {Object} logger - Logger para registrar eventos de conexão
 * @returns {Promise<Object>} Instância do banco de dados conectado
 * 
 * Se já estiver conectado, retorna a conexão existente.
 * Caso contrário, cria uma nova conexão e configura índices nas coleções.
 * 
 * Configurações da conexão:
 * - maxPoolSize: 20 conexões simultâneas no pool
 * - connectTimeoutMS: 15 segundos de timeout para conectar
 */
export async function connectMongo(env, logger) {
  // Se já conectado, retorna a instância existente
  if (client) return db;
  
  // Cria novo cliente MongoDB com as configurações
  client = new MongoClient(env.MONGODB_URI, {
    maxPoolSize: 20,           // Máximo de 20 conexões simultâneas
    connectTimeoutMS: 15000    // Timeout de 15 segundos para conectar
  });
  
  // Estabelece a conexão
  await client.connect();
  
  // Seleciona o banco de dados especificado
  db = client.db(env.MONGODB_DB);
  
  // Registra sucesso da conexão
  logger.info({ db: env.MONGODB_DB }, 'Mongo conectado');
  
  // Cria índices necessários nas coleções
  await ensureIndexes();
  
  return db;
}

/**
 * Retorna a instância do banco de dados
 * 
 * @returns {Object} Instância do banco MongoDB
 * @throws {Error} Se o banco não estiver conectado
 * 
 * Use esta função em vez de acessar 'db' diretamente para garantir
 * que a conexão foi estabelecida antes de usar.
 */
export function getDB() {
  if (!db) throw new Error('DB não conectado');
  return db;
}

/**
 * Cria índices necessários nas coleções do MongoDB
 * 
 * Índices criados:
 * - users.username: Índice único para garantir usernames únicos
 * - players.userId: Índice único para garantir um personagem por usuário
 * - maps.id: Índice único para garantir IDs de mapas únicos
 * 
 * Índices melhoram a performance de consultas e garantem integridade dos dados.
 * Esta função é chamada automaticamente durante a inicialização.
 * 
 * @returns {Promise<void>}
 */
export async function ensureIndexes() {
  const db = getDB();
  
  // Cria índice único no campo username da coleção users
  // Isso impede que dois usuários tenham o mesmo nome
  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  
  // Cria índice único no campo userId da coleção players
  // Isso garante que cada usuário tenha apenas um personagem
  await db.collection('players').createIndex({ userId: 1 }, { unique: true });
  
  // Cria índice único no campo id da coleção maps
  // Isso garante que cada mapa tenha um ID único
  await db.collection('maps').createIndex({ id: 1 }, { unique: true });
}