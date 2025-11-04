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
 *   premium: number,            // Dias de premium restantes (0 = não premium)
 *   premiumExpiry: Date | null, // Data de expiração do premium
 *   costumes: Array,            // Array de IDs de costumes desbloqueados (array de números)
 *   costumeList: Object,        // Mapa de costume ID -> custo em diamantes (ex: {1: 5, 2: 10})
 *   costumePercent: number,     // Porcentagem de costumes desbloqueados (0-100)
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
    premium: 0,         // Dias de premium (0 = não premium)
    premiumExpiry: null, // Data de expiração do premium
    costumes: [],       // Array de costumes desbloqueados (vazio inicialmente)
    costumeList: {},    // Mapa de costume ID -> custo (vazio, será populado pelo servidor)
    costumePercent: 0,  // Porcentagem de costumes desbloqueados (0%)
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

/**
 * Adiciona dias de premium a um usuário
 * 
 * @param {string} userId - ID do usuário (_id)
 * @param {number} days - Número de dias de premium a adicionar
 * @returns {Promise<void>}
 * 
 * Atualiza o campo premium e calcula a nova data de expiração.
 * Se o usuário já tem premium ativo, adiciona aos dias existentes.
 */
export async function addPremiumDays(userId, days) {
  const db = getDB();
  const user = await getUserById(userId);
  
  if (!user) return;
  
  // Calcula nova data de expiração
  const now = new Date();
  let expiryDate;
  
  if (user.premiumExpiry && user.premiumExpiry > now) {
    // Usuário já tem premium ativo, adiciona aos dias existentes
    expiryDate = new Date(user.premiumExpiry);
    expiryDate.setDate(expiryDate.getDate() + days);
  } else {
    // Novo premium ou expirado, começa a partir de hoje
    expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() + days);
  }
  
  // Calcula dias restantes
  const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
  
  await db.collection('users').updateOne(
    { _id: userId },
    { 
      $set: { 
        premium: Math.max(0, daysRemaining),
        premiumExpiry: expiryDate,
        updatedAt: new Date()
      } 
    }
  );
}

/**
 * Verifica e atualiza o status de premium de um usuário
 * 
 * @param {string} userId - ID do usuário (_id)
 * @returns {Promise<number>} Dias de premium restantes (0 se expirado)
 * 
 * Verifica se o premium expirou e atualiza o campo premium se necessário.
 * Deve ser chamado durante o login para garantir dados corretos.
 */
export async function checkAndUpdatePremium(userId) {
  const db = getDB();
  const user = await getUserById(userId);
  
  if (!user || !user.premiumExpiry) {
    return 0;
  }
  
  const now = new Date();
  
  if (user.premiumExpiry <= now) {
    // Premium expirado, zera os campos
    await db.collection('users').updateOne(
      { _id: userId },
      { 
        $set: { 
          premium: 0,
          premiumExpiry: null,
          updatedAt: new Date()
        } 
      }
    );
    return 0;
  }
  
  // Calcula dias restantes
  const daysRemaining = Math.ceil((user.premiumExpiry - now) / (1000 * 60 * 60 * 24));
  
  // Atualiza o campo premium com os dias corretos
  if (user.premium !== daysRemaining) {
    await db.collection('users').updateOne(
      { _id: userId },
      { 
        $set: { 
          premium: daysRemaining,
          updatedAt: new Date()
        } 
      }
    );
  }
  
  return daysRemaining;
}

/**
 * Adiciona um costume desbloqueado ao usuário
 * 
 * @param {string} userId - ID do usuário (_id)
 * @param {number} costumeId - ID do costume a desbloquear
 * @returns {Promise<void>}
 * 
 * Adiciona o costume à lista de costumes desbloqueados e atualiza a porcentagem.
 */
export async function addCostumeToUser(userId, costumeId) {
  const db = getDB();
  const user = await getUserById(userId);
  
  if (!user) return;
  
  // Inicializa arrays se não existirem (para usuários antigos)
  if (!user.costumes) user.costumes = [];
  if (!user.costumeList) user.costumeList = {};
  
  // Verifica se o usuário já tem esse costume
  if (user.costumes.includes(costumeId)) return;
  
  // Adiciona o costume
  const updatedCostumes = [...user.costumes, costumeId];
  
  // Calcula a porcentagem (assumindo max_costume = 148 como no cliente)
  const maxCostumes = 148;
  const costumePercent = Math.ceil((updatedCostumes.length / maxCostumes) * 100);
  
  await db.collection('users').updateOne(
    { _id: userId },
    { 
      $set: { 
        costumes: updatedCostumes,
        costumePercent: costumePercent,
        updatedAt: new Date()
      } 
    }
  );
}

/**
 * Obtém dados de costumes do usuário (para enviar ao cliente)
 * 
 * @param {string} userId - ID do usuário (_id)
 * @returns {Promise<Object>} Objeto com costumes, costumeList e costumePercent
 * 
 * Retorna os dados de costumes do usuário para sincronização com o cliente.
 */
export async function getUserCostumeData(userId) {
  const user = await getUserById(userId);
  
  if (!user) {
    return {
      costumes: [],
      costumeList: {},
      costumePercent: 0
    };
  }
  
  return {
    costumes: user.costumes || [],
    costumeList: user.costumeList || {},
    costumePercent: user.costumePercent || 0
  };
}

/**
 * Deduz dias de premium do usuário (gasta diamantes)
 * 
 * @param {string} userId - ID do usuário (_id)
 * @param {number} days - Número de dias/diamantes a deduzir
 * @returns {Promise<number>} Dias de premium restantes após dedução
 * 
 * Deduz diamantes do premium do usuário. Retorna o novo valor de premium.
 */
export async function deductPremiumDays(userId, days) {
  const db = getDB();
  const user = await getUserById(userId);
  
  if (!user) return 0;
  
  const currentPremium = user.premium || 0;
  const newPremium = Math.max(0, currentPremium - days);
  
  await db.collection('users').updateOne(
    { _id: userId },
    { 
      $set: { 
        premium: newPremium,
        updatedAt: new Date()
      } 
    }
  );
  
  return newPremium;
}