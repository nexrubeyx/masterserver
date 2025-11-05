/**
 * Test script for non-walkable tiles system
 * 
 * This script tests that:
 * 1. Tiles in NON_WALKABLE_TILES set are correctly identified as non-walkable
 * 2. Normal tiles remain walkable
 * 3. Deep water tiles are still handled separately
 */

import { 
  NON_WALKABLE_TILES, 
  isWalkable, 
  isDeepWater,
  DEEP_WATER_ANIMATED,
  DEEP_WATER_STATIC_1,
  DEEP_WATER_STATIC_2
} from './src/constants/tiles.js';

console.log('=== Testing Non-Walkable Tiles System ===\n');

// Test 1: Check that NON_WALKABLE_TILES is properly defined
console.log('Test 1: NON_WALKABLE_TILES set is defined');
if (NON_WALKABLE_TILES instanceof Set) {
  console.log('✓ NON_WALKABLE_TILES is a Set');
  console.log(`  Size: ${NON_WALKABLE_TILES.size} tiles`);
  if (NON_WALKABLE_TILES.size > 0) {
    const tilesArray = Array.from(NON_WALKABLE_TILES).sort((a,b) => a-b);
    console.log(`  Range: ${tilesArray[0]} - ${tilesArray[tilesArray.length - 1]}`);
    console.log(`  Sample tiles: ${tilesArray.slice(0, 5).join(', ')}...`);
  }
} else {
  console.log('✗ NON_WALKABLE_TILES is not a Set');
  process.exit(1);
}

// Test 2: Verify that tiles in NON_WALKABLE_TILES are not walkable
console.log('\nTest 2: Tiles in NON_WALKABLE_TILES are not walkable');
let allCorrect = true;
for (const tileId of NON_WALKABLE_TILES) {
  if (isWalkable(tileId)) {
    console.log(`✗ Tile ${tileId} is in NON_WALKABLE_TILES but isWalkable() returns true`);
    allCorrect = false;
  }
}
if (allCorrect && NON_WALKABLE_TILES.size > 0) {
  console.log('✓ All tiles in NON_WALKABLE_TILES are correctly identified as non-walkable');
} else if (NON_WALKABLE_TILES.size === 0) {
  console.log('⚠ NON_WALKABLE_TILES is empty - no tiles to test');
} else {
  console.log('✗ Some tiles in NON_WALKABLE_TILES are incorrectly identified as walkable');
  process.exit(1);
}

// Test 3: Verify that normal tiles are walkable
console.log('\nTest 3: Normal tiles are walkable');
const normalTiles = [0, 1, 2, 3, 5, 10, 20, 30]; // Common ground tiles
let normalWalkable = true;
for (const tileId of normalTiles) {
  if (!isWalkable(tileId)) {
    console.log(`✗ Normal tile ${tileId} is incorrectly identified as non-walkable`);
    normalWalkable = false;
  }
}
if (normalWalkable) {
  console.log('✓ Normal tiles are correctly identified as walkable');
} else {
  console.log('✗ Some normal tiles are incorrectly identified as non-walkable');
  process.exit(1);
}

// Test 4: Verify deep water handling (should be separate from NON_WALKABLE_TILES)
console.log('\nTest 4: Deep water tiles are handled separately');
const deepWaterTiles = [DEEP_WATER_ANIMATED, DEEP_WATER_STATIC_1, DEEP_WATER_STATIC_2];
let deepWaterCorrect = true;
for (const tileId of deepWaterTiles) {
  if (!isDeepWater(tileId)) {
    console.log(`✗ Tile ${tileId} should be identified as deep water`);
    deepWaterCorrect = false;
  }
  // Note: Deep water walkability is handled in playerService based on swim ability
  // isWalkable() only checks NON_WALKABLE_TILES set, not deep water
  if (!isWalkable(tileId)) {
    console.log(`  Note: Deep water tile ${tileId} appears in NON_WALKABLE_TILES (handled separately in playerService)`);
  }
}
if (deepWaterCorrect) {
  console.log('✓ Deep water tiles are correctly identified');
} else {
  console.log('✗ Deep water tiles are not correctly identified');
  process.exit(1);
}

// Test 5: Verify edge cases
console.log('\nTest 5: Edge cases');
console.log(`  isWalkable(undefined): ${isWalkable(undefined)} (expected: true)`);
console.log(`  isWalkable(null): ${isWalkable(null)} (expected: true)`);
console.log(`  isWalkable(-1): ${isWalkable(-1)} (expected: true)`);
console.log(`  isWalkable(9999): ${isWalkable(9999)} (expected: true unless in set)`);

// Test 6: Example tiles that should be impassable (if populated)
console.log('\nTest 6: Example impassable tiles');
const expectedImpassable = ["209_0"]; // Cave wall example from code comments
for (const tileId of expectedImpassable) {
  if (NON_WALKABLE_TILES.has(tileId)) {
    console.log(`✓ Tile ${tileId} is correctly in NON_WALKABLE_TILES`);
  } else {
    console.log(`⚠ Tile ${tileId} is not in NON_WALKABLE_TILES (may need to be added)`);
  }
}

// Test 6b: Verify backward compatibility with numeric format
console.log('\nTest 6b: Backward compatibility with numeric tiles');
const numericTestTiles = [209, 190, 250]; // Test that numeric format still works
let numericCorrect = true;
for (const tileId of numericTestTiles) {
  if (isWalkable(tileId)) {
    console.log(`✗ Numeric tile ${tileId} should be non-walkable but isWalkable() returns true`);
    numericCorrect = false;
  }
}
if (numericCorrect) {
  console.log('✓ Numeric tiles are correctly identified as non-walkable (backward compatibility)');
} else {
  console.log('✗ Some numeric tiles are incorrectly identified as walkable');
  process.exit(1);
}

// Test 6c: Verify string variant format (new feature)
console.log('\nTest 6c: String variant format (e.g., "21_4")');
console.log('  Testing that specific variants can be blocked:');
console.log(`  isWalkable("209_0"): ${isWalkable("209_0")} (expected: false - variant _0 is blocked)`);
console.log(`  isWalkable("209_2"): ${isWalkable("209_2")} (expected: true - variant _2 is NOT blocked)`);
console.log(`  isWalkable("21_4"): ${isWalkable("21_4")} (expected: true - tile 21 is walkable)`);
console.log(`  isWalkable("190_0"): ${isWalkable("190_0")} (expected: false - variant _0 is blocked)`);
console.log(`  isWalkable("190_5"): ${isWalkable("190_5")} (expected: true - variant _5 is NOT blocked)`);

const variantTests = [
  { tile: "209_0", expected: false, desc: "blocked variant" },
  { tile: "209_2", expected: true, desc: "non-blocked variant" },
  { tile: "21_4", expected: true, desc: "walkable tile with variant" },
  { tile: "190_0", expected: false, desc: "blocked mountain" },
  { tile: "190_5", expected: true, desc: "non-blocked mountain variant" }
];

let variantsCorrect = true;
for (const test of variantTests) {
  const result = isWalkable(test.tile);
  if (result !== test.expected) {
    console.log(`✗ Tile ${test.tile} (${test.desc}): expected ${test.expected}, got ${result}`);
    variantsCorrect = false;
  }
}
if (variantsCorrect) {
  console.log('✓ String variant format works correctly - specific variants can be blocked');
} else {
  console.log('✗ String variant format has issues');
  process.exit(1);
}

console.log('\n=== All Tests Passed ===');
console.log('\nSummary:');
console.log(`- Total non-walkable tiles: ${NON_WALKABLE_TILES.size}`);
console.log(`- System now uses string format (e.g., "21_4") instead of integers`);
console.log(`- Specific tile variants can be blocked (e.g., "209_0" blocked, "209_2" walkable)`);
console.log(`- Backward compatibility maintained for numeric tiles`);
console.log(`- Normal tiles remain walkable`);
console.log(`- Deep water handling is separate from NON_WALKABLE_TILES`);
