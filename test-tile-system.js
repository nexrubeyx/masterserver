/**
 * Test Suite for Tile Validation and Speed Modifier System
 * 
 * This test suite validates:
 * 1. Tile walkability system (non-walkable tiles)
 * 2. Tile speed modifier system (buffs and debuffs)
 * 3. Integration with movement system
 */

import {
  isWalkable,
  getTileSpeedModifier,
  getModifiedSpeed,
  NON_WALKABLE_TILES,
  TILE_SPEED_MODIFIERS,
  isDeepWater
} from './src/constants/tiles.js';

console.log('=== Tile System Test Suite ===\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    passed++;
  } else {
    console.log(`✗ ${message}`);
    failed++;
  }
}

function assertEquals(actual, expected, message) {
  if (actual === expected) {
    console.log(`✓ ${message}`);
    passed++;
  } else {
    console.log(`✗ ${message} (expected: ${expected}, got: ${actual})`);
    failed++;
  }
}

// === TEST 1: Tile Walkability System ===
console.log('Testing Tile Walkability System:');

// Test that regular tiles are walkable
assert(isWalkable(0), 'Tile 0 should be walkable');
assert(isWalkable(1), 'Tile 1 should be walkable');
assert(isWalkable(21), 'Tile 21 (grass) should be walkable');

// Test that deep water tiles are handled separately (not in NON_WALKABLE_TILES)
// Deep water blocking is handled in playerService with canSwim check
assert(isWalkable(215), 'Tile 215 (deep water) should return true from isWalkable (handled separately)');
assert(isWalkable(248), 'Tile 248 (deep water) should return true from isWalkable (handled separately)');
assert(isWalkable(325), 'Tile 325 (animated deep water) should return true from isWalkable (handled separately)');

// Test that we can add non-walkable tiles
console.log(`\nNON_WALKABLE_TILES set has ${NON_WALKABLE_TILES.size} entries`);
if (NON_WALKABLE_TILES.size > 0) {
  const firstNonWalkable = [...NON_WALKABLE_TILES][0];
  assert(!isWalkable(firstNonWalkable), `Tile ${firstNonWalkable} should be non-walkable`);
}

console.log('\n=== TEST 2: Speed Modifier System ===');

// Test default speed modifier (1.0 = no modification)
assertEquals(getTileSpeedModifier(0), 1.0, 'Tile 0 should have default speed modifier 1.0');
assertEquals(getTileSpeedModifier(21), 1.0, 'Tile 21 should have default speed modifier 1.0');
assertEquals(getTileSpeedModifier(999), 1.0, 'Unknown tile should have default speed modifier 1.0');

// Test that TILE_SPEED_MODIFIERS is a Map
assert(TILE_SPEED_MODIFIERS instanceof Map, 'TILE_SPEED_MODIFIERS should be a Map');
console.log(`TILE_SPEED_MODIFIERS has ${TILE_SPEED_MODIFIERS.size} entries`);

// If there are speed modifiers defined, test them
if (TILE_SPEED_MODIFIERS.size > 0) {
  for (const [tileId, modifier] of TILE_SPEED_MODIFIERS.entries()) {
    assertEquals(
      getTileSpeedModifier(tileId), 
      modifier, 
      `Tile ${tileId} should have speed modifier ${modifier}`
    );
  }
}

console.log('\n=== TEST 3: Modified Speed Calculation ===');

// Test getModifiedSpeed function
const baseSpeed = 750; // ms per tile

// Test normal tile (multiplier 1.0)
assertEquals(
  getModifiedSpeed(baseSpeed, 0), 
  750, 
  'Normal tile should not modify speed (750ms)'
);

// Test theoretical speed modifiers
// These tests demonstrate how the system would work with actual modifiers

// Simulate a slow tile (multiplier 0.5 = 50% speed = 2x time)
const slowTileId = 22;
TILE_SPEED_MODIFIERS.set(slowTileId, 0.5);
assertEquals(
  getModifiedSpeed(baseSpeed, slowTileId), 
  1500, 
  'Slow tile (0.5x speed) should take 1500ms (2x time)'
);

// Simulate a fast tile (multiplier 1.5 = 150% speed = 0.67x time)
const fastTileId = 23;
TILE_SPEED_MODIFIERS.set(fastTileId, 1.5);
assertEquals(
  getModifiedSpeed(baseSpeed, fastTileId), 
  500, 
  'Fast tile (1.5x speed) should take 500ms (0.67x time)'
);

// Simulate a very fast tile (multiplier 2.0 = 200% speed = 0.5x time)
const veryFastTileId = 24;
TILE_SPEED_MODIFIERS.set(veryFastTileId, 2.0);
assertEquals(
  getModifiedSpeed(baseSpeed, veryFastTileId), 
  375, 
  'Very fast tile (2.0x speed) should take 375ms (0.5x time)'
);

// Clean up test modifiers
TILE_SPEED_MODIFIERS.delete(slowTileId);
TILE_SPEED_MODIFIERS.delete(fastTileId);
TILE_SPEED_MODIFIERS.delete(veryFastTileId);

console.log('\n=== TEST 4: Integration Tests ===');

// Test that deep water check still works (should not interfere with new system)
assert(isDeepWater(215), 'Deep water check should still work for tile 215');
assert(isDeepWater(248), 'Deep water check should still work for tile 248');
assert(isDeepWater(325), 'Deep water check should still work for tile 325');
assert(!isDeepWater(0), 'Regular tile should not be deep water');

// Test edge cases
assertEquals(
  getTileSpeedModifier(null), 
  1.0, 
  'null tile should return default modifier'
);
assertEquals(
  getTileSpeedModifier(undefined), 
  1.0, 
  'undefined tile should return default modifier'
);
assertEquals(
  getTileSpeedModifier(-1), 
  1.0, 
  'negative tile should return default modifier'
);

console.log('\n=== Test Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed === 0) {
  console.log('\n✓ All tests passed! Tile system is working correctly.');
  process.exit(0);
} else {
  console.log(`\n✗ ${failed} test(s) failed.`);
  process.exit(1);
}
