/**
 * Movement System Constants
 * 
 * This module defines constants and utilities for the OTCv8-compatible
 * movement system, including diagonal movement support and timing delays.
 * 
 * Direction system follows OTCv8 conventions:
 * - 0-3: Cardinal directions (N, E, S, W)
 * - 4-7: Diagonal directions (NE, SE, SW, NW)
 */

// === DIRECTION CONSTANTS ===
// Cardinal directions (0-3) - Standard 4-way movement
export const DIRECTION_NORTH = 0;      // Up
export const DIRECTION_EAST = 1;       // Right
export const DIRECTION_SOUTH = 2;      // Down
export const DIRECTION_WEST = 3;       // Left

// Diagonal directions (4-7) - OTCv8 extended movement
export const DIRECTION_NORTHEAST = 4;  // Up-Right
export const DIRECTION_SOUTHEAST = 5;  // Down-Right
export const DIRECTION_SOUTHWEST = 6;  // Down-Left
export const DIRECTION_NORTHWEST = 7;  // Up-Left

// Maximum valid direction value
export const MAX_DIRECTION = 7;

// === MOVEMENT TIMING DELAYS (milliseconds) ===
// These delays control movement responsiveness and prevent spam

// Delay before first step when starting to walk
export const WALK_FIRST_STEP_DELAY = 100;

// Delay when changing direction while walking
export const WALK_TURN_DELAY = 50;

// Delay after using stairs (floor change)
export const WALK_STAIRS_DELAY = 150;

// Delay after teleportation (far distance)
export const WALK_TELEPORT_DELAY = 100;

// Delay when using Ctrl+Direction to turn without walking
export const WALK_CTRL_TURN_DELAY = 200;

// Minimum time between walk attempts (prevents spam)
export const WALK_MINIMUM_INTERVAL = 20;

// === WALK LOCK DURATION ===
// Time to lock walking after certain events

// Lock duration after walk cancellation
export const WALK_CANCEL_LOCK = 50;

// Lock duration for WSAD walking mode (smoother diagonal)
export const WALK_WSAD_LOCK = 100;

// === COORDINATE OFFSETS ===
/**
 * Get coordinate offset for a given direction
 * 
 * @param {number} direction - Direction (0-7)
 * @returns {Object} { dx, dy } - Coordinate offset
 */
export function getDirectionOffset(direction) {
  const offsets = {
    [DIRECTION_NORTH]: { dx: 0, dy: -1 },      // 0: North (up)
    [DIRECTION_EAST]: { dx: 1, dy: 0 },        // 1: East (right)
    [DIRECTION_SOUTH]: { dx: 0, dy: 1 },       // 2: South (down)
    [DIRECTION_WEST]: { dx: -1, dy: 0 },       // 3: West (left)
    [DIRECTION_NORTHEAST]: { dx: 1, dy: -1 },  // 4: Northeast (up-right)
    [DIRECTION_SOUTHEAST]: { dx: 1, dy: 1 },   // 5: Southeast (down-right)
    [DIRECTION_SOUTHWEST]: { dx: -1, dy: 1 },  // 6: Southwest (down-left)
    [DIRECTION_NORTHWEST]: { dx: -1, dy: -1 }  // 7: Northwest (up-left)
  };
  return offsets[direction] || { dx: 0, dy: 0 };
}

/**
 * Check if direction is valid
 * 
 * @param {number} direction - Direction to validate
 * @returns {boolean} True if valid direction (0-7)
 */
export function isValidDirection(direction) {
  return Number.isInteger(direction) && direction >= 0 && direction <= MAX_DIRECTION;
}

/**
 * Check if direction is diagonal
 * 
 * @param {number} direction - Direction to check
 * @returns {boolean} True if diagonal (4-7)
 */
export function isDiagonalDirection(direction) {
  return direction >= 4 && direction <= 7;
}

/**
 * Check if direction is cardinal
 * 
 * @param {number} direction - Direction to check
 * @returns {boolean} True if cardinal (0-3)
 */
export function isCardinalDirection(direction) {
  return direction >= 0 && direction <= 3;
}

/**
 * Get the cardinal direction component for rendering
 * For diagonal directions, returns the primary facing direction
 * 
 * @param {number} direction - Direction (0-7)
 * @returns {number} Cardinal direction (0-3)
 */
export function getCardinalComponent(direction) {
  if (direction >= 0 && direction <= 3) {
    // Already cardinal
    return direction;
  }
  
  // For diagonals, return the dominant direction
  // This is used for sprite rendering (most clients only have 4 direction sprites)
  const diagonalToCardinal = {
    [DIRECTION_NORTHEAST]: DIRECTION_EAST,   // Face east for NE (right-facing sprite)
    [DIRECTION_SOUTHEAST]: DIRECTION_EAST,   // Face east for SE (right-facing sprite)
    [DIRECTION_SOUTHWEST]: DIRECTION_WEST,   // Face west for SW (left-facing sprite)
    [DIRECTION_NORTHWEST]: DIRECTION_WEST    // Face west for NW (left-facing sprite)
  };
  
  return diagonalToCardinal[direction] || DIRECTION_SOUTH;
}

/**
 * Calculate distance for movement validation
 * Used to detect teleportation vs normal movement
 * 
 * @param {Object} from - Starting position { x, y }
 * @param {Object} to - Ending position { x, y }
 * @returns {number} Manhattan distance
 */
export function getManhattanDistance(from, to) {
  return Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
}

/**
 * Check if movement is a single step (adjacent tile)
 * 
 * @param {Object} from - Starting position { x, y }
 * @param {Object} to - Ending position { x, y }
 * @returns {boolean} True if adjacent (distance <= 2 for diagonal)
 */
export function isAdjacentTile(from, to) {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  
  // Cardinal: dx=1,dy=0 or dx=0,dy=1
  // Diagonal: dx=1,dy=1
  return (dx <= 1 && dy <= 1) && (dx + dy > 0);
}
