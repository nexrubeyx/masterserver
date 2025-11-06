/**
 * Model de Jogador - Gerenciamento de Personagens
 * 
 * Este módulo gerencia os personagens (players) dos usuários no banco de dados.
 * Cada usuário tem exatamente um personagem associado.
 * 
 * Estrutura do documento Player na coleção 'players':
 * {
 *   _id: ObjectId,              // ID único do personagem
 *   userId: string,             // ID do usuário dono (único, indexado)
 *   name: string,               // Nome do personagem
 *   level: number,              // Nível do personagem
 *   mapId: string,              // ID do mapa onde está
 *   x: number,                  // Posição X no mapa
 *   y: number,                  // Posição Y no mapa
 *   speed: number,              // Velocidade em ms/tile
 *   attackSpeed: number,        // Velocidade de ataque em ms (padrão: 1000ms)
 *   inventory: Array,           // Array de itens do inventário
 *   appearance: {               // Aparência visual do personagem
 *     body: number,             // Sprite do corpo
 *     hair: number,             // Estilo do cabelo
 *     clothes: number,          // Estilo da roupa
 *     hairColor: number,        // Cor do cabelo (RGB decimal)
 *     clothesColor: number,     // Cor da roupa (RGB decimal)
 *     eyeColor: number,         // Cor dos olhos (RGB decimal)
 *     nameColor: number,        // Cor do nome (RGB decimal)
 *     sprite: number            // -1 para humanos, >0 para monstros
 *   },
 *   createdAt: Date,            // Data de criação
 *   updatedAt: Date             // Última atualização
 * }
 */

import { getDB } from '../db/mongo.js';

/**
 * Busca um personagem pelo ID do usuário
 * 
 * @param {string} userId - ID do usuário (_id da coleção users)
 * @returns {Promise<Object|null>} Documento do personagem ou null se não existir
 * 
 * Usado para carregar o personagem existente de um usuário durante o login.
 */
export async function getPlayerByUserId(userId) {
  const db = getDB();
  return db.collection('players').findOne({ userId });
}

/**
 * Cria um novo personagem no banco de dados
 * 
 * @param {Object} params - Dados do novo personagem
 * @param {string} params.userId - ID do usuário dono
 * @param {string} params.name - Nome do personagem
 * @param {string} params.mapId - ID do mapa inicial
 * @param {number} params.x - Posição X inicial
 * @param {number} params.y - Posição Y inicial
 * @param {Object} params.appearance - Objeto com aparência visual
 * @param {number} [params.speed] - Velocidade (opcional, padrão 350ms/tile)
 * @returns {Promise<Object>} Documento do personagem criado (incluindo _id)
 * 
 * Este é chamado quando um novo usuário é criado ou quando um guest
 * faz login pela primeira vez.
 */
export async function createPlayer({ userId, name, mapId, x, y, appearance, speed, attackSpeed }) {
  const db = getDB();
  
  // Cria o documento do personagem
  const doc = {
    userId,                                               // ID do usuário dono
    name,                                                 // Nome do personagem
    level: 1,                                             // Inicia no nível 1
    mapId,                                                // Mapa onde aparece
    x,                                                    // Posição X inicial
    y,                                                    // Posição Y inicial
    speed: Number.isFinite(speed) ? speed : 350,          // Velocidade (padrão 350ms/tile)
    attackSpeed: Number.isFinite(attackSpeed) ? attackSpeed : 1000,  // Velocidade de ataque (padrão 1000ms)
    inventory: [],                                        // Inventário vazio
    appearance,                                           // Aparência visual completa
    createdAt: new Date(),                                // Data de criação
    updatedAt: new Date()                                 // Data de atualização
  };
  
  // Insere no banco de dados
  const res = await db.collection('players').insertOne(doc);
  
  // Retorna o documento com o _id gerado
  return { ...doc, _id: res.insertedId };
}

/**
 * Salva a posição atual do personagem no banco de dados
 * 
 * @param {string} playerId - ID do personagem (_id)
 * @param {string} mapId - ID do mapa atual
 * @param {number} x - Posição X atual
 * @param {number} y - Posição Y atual
 * @returns {Promise<void>}
 * 
 * Chamado periodicamente e quando o jogador desconecta para persistir
 * sua posição e permitir que continue de onde parou no próximo login.
 */
export async function savePlayerPosition(playerId, mapId, x, y) {
  const db = getDB();
  
  await db.collection('players').updateOne(
    { _id: playerId },                                    // Busca pelo ID
    { $set: { 
      mapId,                                              // Atualiza mapa
      x,                                                  // Atualiza posição X
      y,                                                  // Atualiza posição Y
      updatedAt: new Date()                               // Atualiza timestamp
    }}
  );
}

/**
 * Salva o inventário do personagem no banco de dados
 * 
 * @param {string} playerId - ID do personagem (_id)
 * @param {Array} inventory - Array de itens do inventário
 * @returns {Promise<void>}
 * 
 * Chamado quando o inventário do jogador é modificado (coletar item,
 * usar item, dropar item, etc).
 */
export async function savePlayerInventory(playerId, inventory) {
  const db = getDB();
  
  await db.collection('players').updateOne(
    { _id: playerId },                                    // Busca pelo ID
    { $set: { 
      inventory,                                          // Substitui inventário completo
      updatedAt: new Date()                               // Atualiza timestamp
    }}
  );
}