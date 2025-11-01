/**
 * Map Model - Gerenciamento de Mapas no MongoDB
 * 
 * Este modelo define as operações CRUD para mapas armazenados no MongoDB.
 * Mapas são carregados de arquivos JSON e armazenados no banco com versionamento.
 * 
 * Estrutura do documento:
 * {
 *   id: "overworld",         // ID único do mapa
 *   version: 1,              // Versão do mapa (para detectar mudanças)
 *   title: "Mundo Principal",
 *   width: 100,
 *   height: 100,
 *   tiles: [[...], [...]],   // Array 2D de tiles
 *   neighbors: {...},        // Mapas vizinhos
 *   objectSpawns: [...],     // Objetos animados
 *   updatedAt: Date          // Timestamp da última atualização
 * }
 */

import { getDB } from '../db/mongo.js';

/**
 * Nome da coleção no MongoDB
 */
const COLLECTION = 'maps';

/**
 * Busca um mapa por ID
 * 
 * @param {string} mapId - ID do mapa
 * @returns {Promise<Object|null>} Documento do mapa ou null
 */
export async function findMapById(mapId) {
  const db = getDB();
  return await db.collection(COLLECTION).findOne({ id: mapId });
}

/**
 * Busca todos os mapas
 * 
 * @returns {Promise<Array>} Array de documentos de mapas
 */
export async function findAllMaps() {
  const db = getDB();
  return await db.collection(COLLECTION).find({}).toArray();
}

/**
 * Salva ou atualiza um mapa no MongoDB
 * 
 * NOTA: Esta função modifica o objeto mapData in-place, adicionando o campo updatedAt.
 * Isso é intencional para manter a referência ao objeto que será usado posteriormente.
 * 
 * @param {Object} mapData - Dados do mapa (deve incluir id e version) - será modificado!
 * @returns {Promise<Object>} Resultado da operação
 */
export async function upsertMap(mapData) {
  const db = getDB();
  
  // Adiciona timestamp de atualização (modifica o objeto original)
  mapData.updatedAt = new Date();
  
  // Usa upsert para criar ou atualizar o mapa
  return await db.collection(COLLECTION).updateOne(
    { id: mapData.id },
    { $set: mapData },
    { upsert: true }
  );
}
