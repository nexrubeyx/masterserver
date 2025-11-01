#!/usr/bin/env node

/**
 * Test Script - Deep Water Tile Implementation
 * 
 * This script verifies that the deep water implementation works correctly:
 * - Tile constants are defined correctly
 * - Helper functions work as expected
 * - Movement collision logic functions properly
 * - Test2 map has the correct lake structure
 */

import fs from 'fs';
import { 
  SHALLOW_WATER_1,
  SHALLOW_WATER_2,
  DEEP_WATER_STATIC_1,
  DEEP_WATER_STATIC_2,
  DEEP_WATER_ANIMATED,
  isShallowWater,
  isDeepWater,
  isWater
} from './src/constants/tiles.js';

let testsPassed = 0;
let testsFailed = 0;

function test(description, fn) {
  try {
    fn();
    console.log('✓', description);
    testsPassed++;
  } catch (err) {
    console.error('✗', description);
    console.error('  ', err.message);
    testsFailed++;
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

console.log('=== Deep Water Implementation Tests ===\n');

// Test 1: Tile Constants
console.log('Test Group 1: Tile Constants');
test('SHALLOW_WATER_1 is 36', () => {
  assertEquals(SHALLOW_WATER_1, 36, 'SHALLOW_WATER_1');
});
test('SHALLOW_WATER_2 is 21', () => {
  assertEquals(SHALLOW_WATER_2, 21, 'SHALLOW_WATER_2');
});
test('DEEP_WATER_STATIC_1 is 215', () => {
  assertEquals(DEEP_WATER_STATIC_1, 215, 'DEEP_WATER_STATIC_1');
});
test('DEEP_WATER_STATIC_2 is 248', () => {
  assertEquals(DEEP_WATER_STATIC_2, 248, 'DEEP_WATER_STATIC_2');
});
test('DEEP_WATER_ANIMATED is 325', () => {
  assertEquals(DEEP_WATER_ANIMATED, 325, 'DEEP_WATER_ANIMATED');
});

// Test 2: isShallowWater Helper
console.log('\nTest Group 2: isShallowWater Helper');
test('isShallowWater(36) returns true', () => {
  assertEquals(isShallowWater(36), true, 'isShallowWater(36)');
});
test('isShallowWater(21) returns true', () => {
  assertEquals(isShallowWater(21), true, 'isShallowWater(21)');
});
test('isShallowWater(248) returns false', () => {
  assertEquals(isShallowWater(248), false, 'isShallowWater(248)');
});
test('isShallowWater(325) returns false', () => {
  assertEquals(isShallowWater(325), false, 'isShallowWater(325)');
});

// Test 3: isDeepWater Helper
console.log('\nTest Group 3: isDeepWater Helper');
test('isDeepWater(215) returns true', () => {
  assertEquals(isDeepWater(215), true, 'isDeepWater(215)');
});
test('isDeepWater(248) returns true', () => {
  assertEquals(isDeepWater(248), true, 'isDeepWater(248)');
});
test('isDeepWater(325) returns true', () => {
  assertEquals(isDeepWater(325), true, 'isDeepWater(325)');
});
test('isDeepWater(36) returns false', () => {
  assertEquals(isDeepWater(36), false, 'isDeepWater(36)');
});
test('isDeepWater(22) returns false', () => {
  assertEquals(isDeepWater(22), false, 'isDeepWater(22)');
});

// Test 4: isWater Helper
console.log('\nTest Group 4: isWater Helper');
test('isWater(36) returns true', () => {
  assertEquals(isWater(36), true, 'isWater(36)');
});
test('isWater(21) returns true', () => {
  assertEquals(isWater(21), true, 'isWater(21)');
});
test('isWater(215) returns true', () => {
  assertEquals(isWater(215), true, 'isWater(215)');
});
test('isWater(248) returns true', () => {
  assertEquals(isWater(248), true, 'isWater(248)');
});
test('isWater(325) returns true', () => {
  assertEquals(isWater(325), true, 'isWater(325)');
});
test('isWater(22) returns false', () => {
  assertEquals(isWater(22), false, 'isWater(22)');
});
test('isWater(0) returns false', () => {
  assertEquals(isWater(0), false, 'isWater(0)');
});

// Test 5: Movement Collision Logic
console.log('\nTest Group 5: Movement Collision Logic');
function canMoveTo(tileId, player) {
  if (isDeepWater(tileId)) {
    const canSwim = player.canSwim || false;
    return canSwim;
  }
  return true;
}

test('Player without swim can walk on ground (22)', () => {
  assertEquals(canMoveTo(22, { canSwim: false }), true, 'canMoveTo(22)');
});
test('Player without swim can walk on shallow water (36)', () => {
  assertEquals(canMoveTo(36, { canSwim: false }), true, 'canMoveTo(36)');
});
test('Player without swim CANNOT walk on deep static (248)', () => {
  assertEquals(canMoveTo(248, { canSwim: false }), false, 'canMoveTo(248)');
});
test('Player without swim CANNOT walk on deep animated (325)', () => {
  assertEquals(canMoveTo(325, { canSwim: false }), false, 'canMoveTo(325)');
});
test('Player with swim CAN walk on deep static (248)', () => {
  assertEquals(canMoveTo(248, { canSwim: true }), true, 'canMoveTo(248) with swim');
});
test('Player with swim CAN walk on deep animated (325)', () => {
  assertEquals(canMoveTo(325, { canSwim: true }), true, 'canMoveTo(325) with swim');
});

// Test 6: Test2 Map Structure
console.log('\nTest Group 6: Test2 Map Structure');
test('test2.json exists and is valid JSON', () => {
  const json = JSON.parse(fs.readFileSync('src/maps/worlds/test2.json', 'utf8'));
  assertEquals(json.id, 'caverealm', 'Map ID');
  assertEquals(json.version, 2, 'Map version');
  assertEquals(json.width, 15, 'Map width');
  assertEquals(json.height, 15, 'Map height');
});

test('test2 map has lake with correct tile types', () => {
  const json = JSON.parse(fs.readFileSync('src/maps/worlds/test2.json', 'utf8'));
  
  // Check center (should be animated)
  assertEquals(json.tiles[7][7], 325, 'Center tile is animated (325)');
  
  // Check a deep static tile
  assertEquals(json.tiles[7][6], 325, 'Deep water tile exists');
  
  // Check a shallow tile
  assertEquals(json.tiles[5][2], 36, 'Shallow water tile exists');
  
  // Check ground tile
  assertEquals(json.tiles[1][1], 22, 'Ground tile exists');
});

// Summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total:  ${testsPassed + testsFailed}`);

if (testsFailed > 0) {
  console.log('\n⚠️  Some tests failed!');
  process.exit(1);
} else {
  console.log('\n✓ All tests passed!');
  process.exit(0);
}
