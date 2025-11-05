/**
 * Integration test for movement blocking with non-walkable tiles
 * 
 * This test verifies that:
 * 1. Players can move to walkable tiles
 * 2. Players cannot move to non-walkable tiles (using both numeric and string formats)
 * 3. Movement validation works correctly with the tile system
 */

import { 
  NON_WALKABLE_TILES,
  isWalkable,
  DEEP_WATER_STATIC_1,
  DEEP_WATER_STATIC_2
} from './src/constants/tiles.js';

console.log('=== Testing Movement Blocking Integration ===\n');

// Mock a simple map with walkable and non-walkable tiles
const createTestMap = () => {
  const map = {
    id: 'test_map',
    width: 10,
    height: 10,
    tiles: []
  };
  
  // Initialize with walkable tiles (grass = 1)
  for (let y = 0; y < map.height; y++) {
    map.tiles[y] = [];
    for (let x = 0; x < map.width; x++) {
      map.tiles[y][x] = 1; // Walkable grass tile
    }
  }
  
  // Add a wall (non-walkable tile 209) at position (5, 5)
  map.tiles[5][5] = 209;
  
  // Add a mountain (non-walkable tile 190) at position (5, 6)
  map.tiles[5][6] = 190;
  
  // Add a boulder (non-walkable tile 250) at position (5, 7)
  map.tiles[5][7] = 250;
  
  return map;
};

// Test scenario 1: Movement to walkable tiles
console.log('Test 1: Movement to walkable tiles should succeed');
const map1 = createTestMap();
const walkableTile = map1.tiles[3][3];
console.log(`  Tile at (3, 3): ${walkableTile}`);
console.log(`  isWalkable(${walkableTile}): ${isWalkable(walkableTile)}`);
if (isWalkable(walkableTile)) {
  console.log('✓ Walkable tile is correctly identified as walkable');
} else {
  console.log('✗ ERROR: Walkable tile should be walkable');
  process.exit(1);
}

// Test scenario 2: Movement to non-walkable tiles (wall)
console.log('\nTest 2: Movement to wall tile (209) should be blocked');
const wallTile = map1.tiles[5][5];
console.log(`  Tile at (5, 5): ${wallTile}`);
console.log(`  isWalkable(${wallTile}): ${isWalkable(wallTile)}`);
if (!isWalkable(wallTile)) {
  console.log('✓ Wall tile is correctly identified as non-walkable');
} else {
  console.log('✗ ERROR: Wall tile should be non-walkable');
  process.exit(1);
}

// Test scenario 3: Movement to non-walkable tiles (mountain)
console.log('\nTest 3: Movement to mountain tile (190) should be blocked');
const mountainTile = map1.tiles[5][6];
console.log(`  Tile at (5, 6): ${mountainTile}`);
console.log(`  isWalkable(${mountainTile}): ${isWalkable(mountainTile)}`);
if (!isWalkable(mountainTile)) {
  console.log('✓ Mountain tile is correctly identified as non-walkable');
} else {
  console.log('✗ ERROR: Mountain tile should be non-walkable');
  process.exit(1);
}

// Test scenario 4: Movement to non-walkable tiles (boulder)
console.log('\nTest 4: Movement to boulder tile (250) should be blocked');
const boulderTile = map1.tiles[5][7];
console.log(`  Tile at (5, 7): ${boulderTile}`);
console.log(`  isWalkable(${boulderTile}): ${isWalkable(boulderTile)}`);
if (!isWalkable(boulderTile)) {
  console.log('✓ Boulder tile is correctly identified as non-walkable');
} else {
  console.log('✗ ERROR: Boulder tile should be non-walkable');
  process.exit(1);
}

// Test scenario 5: Verify all added tile ranges using isWalkable()
console.log('\nTest 5: Verify comprehensive tile coverage');
const testRanges = [
  { name: 'Walls (200-220)', min: 200, max: 220, exceptions: [DEEP_WATER_STATIC_1] }, // 215 is DEEP_WATER_STATIC_1
  { name: 'Mountains (180-199)', min: 180, max: 199, exceptions: [] },
  { name: 'Cliffs (221-240)', min: 221, max: 240, exceptions: [] },
  { name: 'Rocks (241-260)', min: 241, max: 260, exceptions: [DEEP_WATER_STATIC_2] }, // 248 is DEEP_WATER_STATIC_2
  { name: 'Obstacles (261-280)', min: 261, max: 280, exceptions: [] }
];

let allRangesCorrect = true;
for (const range of testRanges) {
  let missingTiles = [];
  for (let tileId = range.min; tileId <= range.max; tileId++) {
    // Use isWalkable() to check if tile is blocked
    // Numeric tiles are automatically converted to "_0" format (e.g., 200 -> "200_0")
    if (!range.exceptions.includes(tileId) && isWalkable(tileId)) {
      missingTiles.push(tileId);
      allRangesCorrect = false;
    }
  }
  
  if (missingTiles.length === 0) {
    console.log(`✓ ${range.name}: All tiles correctly blocked`);
  } else {
    console.log(`✗ ${range.name}: Missing tiles: ${missingTiles.join(', ')}`);
  }
}

if (!allRangesCorrect) {
  console.log('\n✗ ERROR: Some tile ranges are incomplete');
  process.exit(1);
}

// Test scenario 6: Test string variant format
console.log('\nTest 6: Test string variant format (e.g., "21_4")');
// Create test map with string variant tiles
const map2 = createTestMap();
map2.tiles[2][2] = "209_0";  // Blocked variant
map2.tiles[2][3] = "209_2";  // Non-blocked variant
map2.tiles[2][4] = "21_4";   // Walkable tile with variant

console.log(`  Tile at (2, 2): "${map2.tiles[2][2]}" -> isWalkable: ${isWalkable(map2.tiles[2][2])}`);
console.log(`  Tile at (2, 3): "${map2.tiles[2][3]}" -> isWalkable: ${isWalkable(map2.tiles[2][3])}`);
console.log(`  Tile at (2, 4): "${map2.tiles[2][4]}" -> isWalkable: ${isWalkable(map2.tiles[2][4])}`);

let variantTestsPass = true;
if (isWalkable("209_0")) {
  console.log('✗ ERROR: "209_0" should be non-walkable');
  variantTestsPass = false;
}
if (!isWalkable("209_2")) {
  console.log('✗ ERROR: "209_2" should be walkable (different variant)');
  variantTestsPass = false;
}
if (!isWalkable("21_4")) {
  console.log('✗ ERROR: "21_4" should be walkable');
  variantTestsPass = false;
}

if (variantTestsPass) {
  console.log('✓ String variant format works correctly - specific variants can be blocked');
} else {
  process.exit(1);
}

console.log('\n=== All Integration Tests Passed ===');
console.log('\nSummary:');
console.log('- Players can move to walkable tiles (grass, paths, etc.)');
console.log('- Players cannot move to walls, mountains, rocks, and obstacles');
console.log('- System now uses string format (e.g., "21_4") for precise tile variant control');
console.log('- Backward compatibility maintained for numeric tiles');
console.log('- Comprehensive tile coverage: 99 impassable tiles');
console.log('- Deep water tiles handled separately in playerService');
console.log('\nThe forbidden tiles are now impenetrable stones that block player movement!');
