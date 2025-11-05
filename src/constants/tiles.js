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

// === PLAYER MOVEMENT CONSTANTS ===
/**
 * Default player movement speed in milliseconds per tile
 * Used as fallback when player speed is not set or invalid
 */
export const DEFAULT_PLAYER_SPEED = 750;

// === TILE ID PARSING ===
/**
 * Parse tile ID from various formats
 * 
 * Tiles can be in two formats:
 * - Simple number: 21, 36, 209
 * - Variant notation: "21_1", "36_1", "209_2"
 * 
 * This function extracts the base tile ID from either format.
 * 
 * @param {number|string} tile - The tile value (number or string with underscore)
 * @returns {number|null} Base tile ID as number, or null if invalid
 * 
 * Examples:
 * - parseTileId(21) -> 21
 * - parseTileId("36_1") -> 36
 * - parseTileId("209_2") -> 209
 * - parseTileId("invalid") -> null
 */
export function parseTileId(tile) {
  // Handle numeric tiles
  if (typeof tile === 'number') {
    return Number.isFinite(tile) ? tile : null;
  }
  
  // Handle string tiles
  if (typeof tile === 'string') {
    // Empty string is invalid
    if (tile === '') {
      return null;
    }
    
    // Check if tile has underscore notation (e.g., "21_1", "36_1")
    if (tile.includes('_')) {
      const parts = tile.split('_');
      // If first part is empty (e.g., "_1"), it's invalid
      if (parts[0] === '') {
        return null;
      }
      const baseTile = Number(parts[0]);
      return Number.isFinite(baseTile) ? baseTile : null;
    }
    
    // Try to parse as plain number string
    const tileNum = Number(tile);
    return Number.isFinite(tileNum) ? tileNum : null;
  }
  
  // Invalid type
  return null;
}

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
 * Supports both numeric and variant notation:
 * - Numbers: 21, 36
 * - Variant notation: "21_1", "36_1"
 * 
 * @param {number|string} tileId - The tile ID to check (number or string with underscore)
 * @returns {boolean} True if tile is shallow water (36 or 21)
 */
export function isShallowWater(tileId) {
  const baseTileId = parseTileId(tileId);
  if (baseTileId === null) return false;
  return baseTileId === SHALLOW_WATER_1 || baseTileId === SHALLOW_WATER_2;
}

/**
 * Check if a tile is deep water (static or animated)
 * 
 * Supports both numeric and variant notation:
 * - Numbers: 215, 248, 325
 * - Variant notation: "215_1", "248_2", "325_1"
 * 
 * @param {number|string} tileId - The tile ID to check (number or string with underscore)
 * @returns {boolean} True if tile is deep water (215, 248, or 325)
 */
export function isDeepWater(tileId) {
  const baseTileId = parseTileId(tileId);
  if (baseTileId === null) return false;
  return (
    baseTileId === DEEP_WATER_STATIC_1 ||
    baseTileId === DEEP_WATER_STATIC_2 ||
    baseTileId === DEEP_WATER_ANIMATED
  );
}

/**
 * Check if a tile is any type of water (shallow or deep)
 * 
 * Supports both numeric and variant notation:
 * - Numbers: 21, 36, 215, 248, 325
 * - Variant notation: "21_1", "36_1", "215_1"
 * 
 * @param {number|string} tileId - The tile ID to check (number or string with underscore)
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
 * Now uses string format with variant notation (e.g., "21_4", "209_2")
 * to allow blocking specific tile variants instead of just base tile IDs.
 * 
 * Format: "baseId_variant" where:
 * - baseId: the tile type (e.g., 21, 180, 209)
 * - variant: the specific variant (e.g., 0, 1, 2, 3, 4)
 * 
 * Categories of impassable tiles:
 * - Walls and buildings (200-220)
 * - Mountains and cliffs (180-199, 221-240)
 * - Large rocks and boulders (241-260)
 * - Special obstacles (261-280)
 * 
 * Note: Deep water tiles (215, 248, 325) are handled separately via isDeepWater()
 * and player swim ability check in playerService
 */
export const NON_WALKABLE_TILES = new Set([
  // === WALLS AND BUILDINGS (200-220) ===
  "200_0", "201_0", "202_0", "203_0", "204_0", "205_0", "206_0", "207_0", "208_0", "209_0", // Wall tiles
  "210_0", "211_0", "212_0", "213_0", "214_0", // More walls (note: 215 is deep water, handled separately)
  "216_0", "217_0", "218_0", "219_0", "220_0", // Building tiles/lava/special walls
  
  // === MOUNTAINS AND CLIFFS (180-199, 221-240) ===
  "180_0", "181_0", "182_0", "183_0", "184_0", "185_0", "186_0", "187_0", "188_0", "189_0", // Mountain bases
  "190_0", "191_0", "192_0", "193_0", "194_0", "195_0", "196_0", "197_0", "198_0", "199_0", // Mountain peaks/cliffs
  "221_0", "222_0", "223_0", "224_0", "225_0", "226_0", "227_0", "228_0", "229_0", "230_0", // Cliff faces
  "231_0", "232_0", "233_0", "234_0", "235_0", "236_0", "237_0", "238_0", "239_0", "240_0", // High mountains
  
  // === LARGE ROCKS AND BOULDERS (241-260) ===
  "241_0", "242_0", "243_0", "244_0", "245_0", "246_0", "247_0", // Large rocks (note: 248 is DEEP_WATER_STATIC_2, handled separately)
  "249_0", "250_0", "251_0", "252_0", "253_0", "254_0", "255_0", "256_0", "257_0", "258_0", "259_0", "260_0", // Boulders
  
  // === SPECIAL OBSTACLES (261-280) ===
  "261_0", "262_0", "263_0", "264_0", "265_0", "266_0", "267_0", "268_0", "269_0", "270_0", // Fences/gates/barriers
  "271_0", "272_0", "273_0", "274_0", "275_0", "276_0", "277_0", "278_0", "279_0", "280_0", // Special obstacles
]);

/**
 * Check if a tile is walkable
 * 
 * Supports multiple formats:
 * - String variant notation: "21_4", "36_1", "209_2" (primary format)
 * - Numbers: 21, 36, 209 (converted to "21_0", "36_0", "209_0")
 * - String numbers: "21", "36", "209" (converted to "21_0", "36_0", "209_0")
 * 
 * The NON_WALKABLE_TILES set now uses string format with variants,
 * allowing blocking specific tile variants instead of all variants of a base tile.
 * 
 * @param {number|string} tileId - The tile ID to check (number or string with underscore)
 * @returns {boolean} True if tile can be walked on
 */
export function isWalkable(tileId) {
  // Handle invalid input
  if (tileId === undefined || tileId === null) {
    return true;
  }
  
  // Convert tile to normalized string format for checking
  let normalizedTile;
  
  if (typeof tileId === 'string') {
    // String input: check as-is first (for "21_4" format)
    if (NON_WALKABLE_TILES.has(tileId)) {
      return false;
    }
    
    // If no underscore, add "_0" suffix (e.g., "21" -> "21_0")
    if (!tileId.includes('_')) {
      normalizedTile = `${tileId}_0`;
      // Check normalized format before returning
      if (NON_WALKABLE_TILES.has(normalizedTile)) {
        return false;
      }
    }
    // String with underscore already checked above, or normalization checked
    // If not found in either case, tile is walkable
    return true;
  } else if (typeof tileId === 'number') {
    // Number input: convert to "number_0" format (e.g., 21 -> "21_0")
    if (!Number.isFinite(tileId)) {
      return true;
    }
    normalizedTile = `${tileId}_0`;
    // Check normalized format
    if (NON_WALKABLE_TILES.has(normalizedTile)) {
      return false;
    }
  } else {
    // Unknown type, treat as walkable
    return true;
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
 * Supports both numeric and variant notation:
 * - Numbers: 21, 36, 209
 * - Variant notation: "21_1", "36_1", "209_2"
 * 
 * @param {number|string} tileId - The tile ID to check (number or string with underscore)
 * @returns {number} Speed multiplier (1.0 = normal speed)
 */
export function getTileSpeedModifier(tileId) {
  const baseTileId = parseTileId(tileId);
  
  // Handle invalid input gracefully
  if (baseTileId === null) {
    return 1.0;
  }
  
  return TILE_SPEED_MODIFIERS.get(baseTileId) || 1.0;
}

/**
 * Calculate modified speed based on tile
 * 
 * Supports both numeric and variant notation:
 * - Numbers: 21, 36, 209
 * - Variant notation: "21_1", "36_1", "209_2"
 * 
 * @param {number} baseSpeed - Base speed in ms per tile
 * @param {number|string} tileId - The tile ID the player is on (number or string with underscore)
 * @returns {number} Modified speed in ms per tile
 * 
 * Note: Lower speed multiplier = slower movement = MORE time per tile
 *       Higher speed multiplier = faster movement = LESS time per tile
 */
export function getModifiedSpeed(baseSpeed, tileId) {
  // Validate inputs
  if (!Number.isFinite(baseSpeed) || baseSpeed <= 0) {
    baseSpeed = DEFAULT_PLAYER_SPEED;
  }
  
  const baseTileId = parseTileId(tileId);
  if (baseTileId === null) {
    return baseSpeed;
  }
  
  const multiplier = getTileSpeedModifier(baseTileId);
  // Divide by multiplier because:
  // - If multiplier is 2.0 (faster), speed should be halved (less time per tile)
  // - If multiplier is 0.5 (slower), speed should be doubled (more time per tile)
  return baseSpeed / multiplier;
}
