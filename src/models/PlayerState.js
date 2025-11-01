/**
 * Model de Estado do Jogador - Persistência Completa
 * 
 * Este módulo gerencia a persistência completa do estado do jogador no banco de dados.
 * Ao contrário de savePlayerPosition (que salva apenas mapId, x, y), esta função
 * salva TODOS os campos relevantes do estado do jogador.
 * 
 * Campos persistidos:
 * - mapId, x, y: Posição no mundo
 * - dir: Direção que o jogador está olhando (0-3)
 * - level: Nível do personagem
 * - inventory: Array de itens do inventário
 * - appearance: Objeto com aparência visual
 * - speed: Velocidade de movimento (ms/tile)
 * 
 * Uso:
 * - Chamado quando jogador desconecta (WebSocket close)
 * - Chamado durante shutdown gracioso do servidor
 * - Garante que jogador retome exatamente onde parou
 */

import { getDB } from '../db/mongo.js';

/**
 * Salva o estado completo do personagem no banco.
 * Atualiza somente os campos fornecidos (merge).
 *
 * @param {Object} params
 * @param {string} params.playerId - ID do personagem (_id)
 * @param {string} [params.mapId] - ID do mapa atual
 * @param {number} [params.x] - Posição X
 * @param {number} [params.y] - Posição Y
 * @param {number} [params.dir] - Direção (0=cima, 1=direita, 2=baixo, 3=esquerda)
 * @param {number} [params.level] - Nível do personagem
 * @param {Array}  [params.inventory] - Array de itens do inventário
 * @param {Object} [params.appearance] - Objeto de aparência (body, hair, colors, etc)
 * @param {number} [params.speed] - Velocidade de movimento em ms/tile
 * @returns {Promise<void>}
 * 
 * Implementação:
 * - Usa $set para fazer merge (não sobrescreve campos não fornecidos)
 * - Atualiza updatedAt automaticamente
 * - Valida tipos antes de persistir
 */
export async function savePlayerState({
  playerId,
  mapId,
  x,
  y,
  dir,
  level,
  inventory,
  appearance,
  speed
}) {
  const db = getDB();
  const $set = { updatedAt: new Date() };

  // Adiciona campos ao $set apenas se foram fornecidos
  if (mapId !== undefined) $set.mapId = mapId;
  if (x !== undefined) $set.x = x;
  if (y !== undefined) $set.y = y;
  if (typeof dir === 'number') $set.dir = dir;           // optional direction field
  if (typeof level === 'number') $set.level = level;
  if (Array.isArray(inventory)) $set.inventory = inventory;
  if (appearance && typeof appearance === 'object') $set.appearance = appearance;
  if (typeof speed === 'number') $set.speed = speed;

  const result = await db.collection('players').updateOne(
    { _id: playerId },
    { $set }
  );
  
  // Log warning if player document wasn't found
  if (result.matchedCount === 0) {
    console.warn(`Failed to save player state: player ${playerId} not found`);
  }
}
