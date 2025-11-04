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

// === TILE WALKABILITY SYSTEM ===
/**
 * Non-walkable tiles - tiles that players cannot walk on
 * These tiles will block movement unless the player has special abilities
 * 
 * Examples:
 * - Deep water tiles (already handled separately)
 * - Mountain/cliff tiles
 * - Wall tiles
 * - Lava tiles
 */
export const NON_WALKABLE_TILES = new Set([
  // Deep water tiles are already handled by isDeepWater()
  // Add additional non-walkable tiles here
  // Example: 209, // Cave wall
]);

/**
 * Check if a tile is walkable
 * 
 * @param {number} tileId - The tile ID to check
 * @returns {boolean} True if tile can be walked on
 */
export function isWalkable(tileId) {
  // Non-walkable set takes precedence
  if (NON_WALKABLE_TILES.has(tileId)) {
    return false;
  }
  
  // Deep water is also non-walkable by default (unless player can swim)
  // This is handled separately in playerService
  
  return true;
}

// === TILE SPEED MODIFIER SYSTEM ===
/**
 * Speed modifiers for specific tiles
 * 
 * Structure:
 * - key: tile ID
 * - value: speed multiplier
 *   - 1.0 = normal speed
 *   - <1.0 = slower (debuff, e.g., 0.5 = 50% speed, takes 2x time)
 *   - >1.0 = faster (buff, e.g., 2.0 = 200% speed, takes 0.5x time)
 * 
 * Examples:
 * - Mud/swamp tiles: 0.5 (50% speed - takes 2x time per tile)
 * - Road/path tiles: 1.5 (150% speed - takes 0.67x time per tile)
 * - Ice tiles: 2.0 (200% speed - takes 0.5x time per tile)
 */
export const TILE_SPEED_MODIFIERS = new Map([
  // Add speed modifiers here
  // Example entries (uncomment and adjust as needed):
  // [22, 0.5],   // Swamp/mud - slow
  // [23, 1.5],   // Road - fast
  // [24, 2.0],   // Ice/smooth - very fast
]);

/**
 * Get speed multiplier for a tile
 * 
 * @param {number} tileId - The tile ID to check
 * @returns {number} Speed multiplier (1.0 = normal speed)
 */
export function getTileSpeedModifier(tileId) {
  return TILE_SPEED_MODIFIERS.get(tileId) || 1.0;
}

/**
 * Calculate modified speed based on tile
 * 
 * @param {number} baseSpeed - Base speed in ms per tile
 * @param {number} tileId - The tile ID the player is on
 * @returns {number} Modified speed in ms per tile
 * 
 * Note: Lower speed multiplier = slower movement = MORE time per tile
 *       Higher speed multiplier = faster movement = LESS time per tile
 */
export function getModifiedSpeed(baseSpeed, tileId) {
  const multiplier = getTileSpeedModifier(tileId);
  // Divide by multiplier because:
  // - If multiplier is 2.0 (faster), speed should be halved (less time per tile)
  // - If multiplier is 0.5 (slower), speed should be doubled (more time per tile)
  return baseSpeed / multiplier;
}
