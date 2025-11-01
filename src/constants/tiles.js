/**
 * Tile Constants and Helpers - Water Tile Classification
 * 
 * This module defines tile IDs and helper functions for water tile types
 * to maintain 100% parity with the game client's rendering logic.
 * 
 * Client-side facts (from ml.min.js):
 * - Shallow water: tiles 36 or 21 → category 1 (for edge blending)
 * - Deep water (static): tiles 215 or 248 → category 2 (for edge blending)
 * - Deep water (animated): tile 325 → triggers animation overlay
 * - Other (e.g., lava): tile 218 → category 3
 * 
 * IMPORTANT: These tile IDs must be preserved exactly in map data and network
 * messages for the client's edge blending and animation to work correctly.
 */

// === SHALLOW WATER TILES ===
// Category 1 in client's get_edge/tile_sprite
export const SHALLOW_WATER_1 = 36;
export const SHALLOW_WATER_2 = 21;

// === DEEP WATER STATIC TILES ===
// Category 2 in client's get_edge/tile_sprite
export const DEEP_WATER_STATIC_1 = 215;
export const DEEP_WATER_STATIC_2 = 248;

// === DEEP WATER ANIMATED TILE ===
// Triggers animation overlay (map[s].anim.visible = 1)
// NOT categorized in tile_sprite, so needs static deep water ring for edge blending
export const DEEP_WATER_ANIMATED = 325;

/**
 * Check if a tile is shallow water
 * 
 * @param {number} tileId - The tile ID to check
 * @returns {boolean} True if tile is shallow water (36 or 21)
 */
export function isShallowWater(tileId) {
  return tileId === SHALLOW_WATER_1 || tileId === SHALLOW_WATER_2;
}

/**
 * Check if a tile is deep water (static or animated)
 * 
 * @param {number} tileId - The tile ID to check
 * @returns {boolean} True if tile is deep water (215, 248, or 325)
 */
export function isDeepWater(tileId) {
  return (
    tileId === DEEP_WATER_STATIC_1 ||
    tileId === DEEP_WATER_STATIC_2 ||
    tileId === DEEP_WATER_ANIMATED
  );
}

/**
 * Check if a tile is any type of water (shallow or deep)
 * 
 * @param {number} tileId - The tile ID to check
 * @returns {boolean} True if tile is any water type
 */
export function isWater(tileId) {
  return isShallowWater(tileId) || isDeepWater(tileId);
}
