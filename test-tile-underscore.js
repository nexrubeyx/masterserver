/**
 * Test suite for tile underscore notation support
 * 
 * Validates that the tile system correctly handles tiles with underscore notation
 * like "21_1", "25_4" in addition to plain numeric tiles.
 * 
 * Examples: "tiles": "21:21:21_1" or "tiles": "0:21_1:25_4:36_2"
 */

import { MapService } from './src/services/mapService.js';

console.log('=== Tile Underscore Notation - Test Suite ===\n');

let passCount = 0;
let failCount = 0;

function test(description, condition) {
  if (condition) {
    console.log(`✓ ${description}`);
    passCount++;
  } else {
    console.log(`✗ ${description}`);
    failCount++;
  }
}

// Mock environment and logger
const mockEnv = { DEFAULT_CAVE_WALL: 209 };
const mockLogger = {
  info: () => {},
  debug: () => {},
  warn: () => {},
  error: () => {}
};

const mapService = new MapService(mockEnv, mockLogger);

// Test 1: Parse plain numeric tiles (original behavior)
console.log('\n--- Test 1: Plain Numeric Tiles ---');
const map1 = {
  id: 'test1',
  version: 1,
  width: 3,
  height: 2,
  tiles: '0:1:2:3:4:5'
};

mapService.normalizeMapData(map1);
test('Plain numeric tiles: 3x2 array created', map1.tiles.length === 2 && map1.tiles[0].length === 3);
test('Plain numeric tiles: First row [0,1,2]', 
  map1.tiles[0][0] === 0 && map1.tiles[0][1] === 1 && map1.tiles[0][2] === 2);
test('Plain numeric tiles: Second row [3,4,5]',
  map1.tiles[1][0] === 3 && map1.tiles[1][1] === 4 && map1.tiles[1][2] === 5);

// Test 2: Parse tiles with underscores
console.log('\n--- Test 2: Tiles with Underscore Notation ---');
const map2 = {
  id: 'test2',
  version: 1,
  width: 3,
  height: 2,
  tiles: '21_1:25_4:36_2:21_2:25_1:36_5'
};

mapService.normalizeMapData(map2);
test('Underscore tiles: 3x2 array created', map2.tiles.length === 2 && map2.tiles[0].length === 3);
test('Underscore tiles: First tile is string "21_1"', map2.tiles[0][0] === '21_1');
test('Underscore tiles: Second tile is string "25_4"', map2.tiles[0][1] === '25_4');
test('Underscore tiles: Third tile is string "36_2"', map2.tiles[0][2] === '36_2');
test('Underscore tiles: All tiles in second row are strings',
  map2.tiles[1][0] === '21_2' && map2.tiles[1][1] === '25_1' && map2.tiles[1][2] === '36_5');

// Test 3: Mixed numeric and underscore tiles (as per new requirement)
console.log('\n--- Test 3: Mixed Numeric and Underscore Tiles ---');
const map3 = {
  id: 'test3',
  version: 1,
  width: 4,
  height: 1,
  tiles: '21:21:21_1:0'
};

mapService.normalizeMapData(map3);
test('Mixed tiles: Array created', map3.tiles.length === 1 && map3.tiles[0].length === 4);
test('Mixed tiles: First tile is number 21', map3.tiles[0][0] === 21);
test('Mixed tiles: Second tile is number 21', map3.tiles[0][1] === 21);
test('Mixed tiles: Third tile is string "21_1"', map3.tiles[0][2] === '21_1');
test('Mixed tiles: Fourth tile is number 0', map3.tiles[0][3] === 0);

// Test 4: Viewport payload with underscore tiles
console.log('\n--- Test 4: Viewport Payload Generation ---');
const map4 = {
  id: 'test4',
  version: 1,
  width: 5,
  height: 5,
  tiles: [
    [0, 1, 2, 3, 4],
    [5, '21_1', '25_4', 8, 9],
    [10, 11, '36_2', 13, 14],
    [15, 16, 17, '21_2', 19],
    [20, 21, 22, 23, 24]
  ]
};

// Test viewport centered at (2, 2) with radius 2x2 (expecting 4x4 = 16 tiles)
const viewport = mapService.buildViewportPayload(map4, 2, 2, 2, 2, false);
test('Viewport: Generated string is not empty', viewport.length > 0);
test('Viewport: Contains underscore tiles', viewport.includes('21_1') || viewport.includes('25_4'));

const viewportTiles = viewport.split(':');
test('Viewport: Correct number of tiles (4x4=16)', viewportTiles.length === 16);

// Verify specific tiles in viewport (centered at 2,2 with rx=2, ry=2)
// Viewport covers x:[0,4), y:[0,4) = (0,0) to (3,3)
// Order is column-major: for cx in [-2,2), for cy in [-2,2)
// So: (0,0), (0,1), (0,2), (0,3), (1,0), (1,1), ...
const expectedOrder = [
  '0', '5', '10', '15',  // x=0 (2-2=0), y=0,1,2,3
  '1', '21_1', '11', '16',  // x=1 (2-1=1), y=0,1,2,3
  '2', '25_4', '36_2', '17',  // x=2, y=0,1,2,3
  '3', '8', '13', '21_2'  // x=3 (2+1=3), y=0,1,2,3
];

let viewportOrderCorrect = true;
for (let i = 0; i < expectedOrder.length; i++) {
  if (String(viewportTiles[i]) !== String(expectedOrder[i])) {
    console.log(`  Mismatch at index ${i}: expected "${expectedOrder[i]}", got "${viewportTiles[i]}"`);
    viewportOrderCorrect = false;
  }
}
test('Viewport: Tiles in correct order with underscores preserved', viewportOrderCorrect);

// Test 5: Edge cases
console.log('\n--- Test 5: Edge Cases ---');

// Empty underscore (malformed)
const map5a = {
  id: 'test5a',
  version: 1,
  width: 2,
  height: 1,
  tiles: '21_:25'
};
mapService.normalizeMapData(map5a);
test('Edge case: Malformed underscore "21_" is preserved as string', map5a.tiles[0][0] === '21_');

// Multiple underscores
const map5b = {
  id: 'test5b',
  version: 1,
  width: 2,
  height: 1,
  tiles: '21_1_2:25'
};
mapService.normalizeMapData(map5b);
test('Edge case: Multiple underscores "21_1_2" is preserved as string', map5b.tiles[0][0] === '21_1_2');

// Test 6: 2D array format with string tiles (should already be supported)
console.log('\n--- Test 6: 2D Array Format with String Tiles ---');
const map6 = {
  id: 'test6',
  version: 1,
  width: 3,
  height: 2,
  tiles: [
    [0, '21_1', 2],
    ['25_4', 4, '36_2']
  ]
};

mapService.normalizeMapData(map6);
test('2D array: String tiles preserved in first row', map6.tiles[0][1] === '21_1');
test('2D array: String tiles preserved in second row', map6.tiles[1][0] === '25_4' && map6.tiles[1][2] === '36_2');

// Test 7: Real-world example from test-colon-format.json
console.log('\n--- Test 7: Real-world Example ---');
const map7 = {
  id: 'test7',
  version: 1,
  width: 10,
  height: 2,
  tiles: '0:0:0:21:21:36_1:36_1:36_1:21_1:21_1:36_2:36_1:21_1:21_1:21_1:36_1:21_1:36_1:21_1:36_1'
};

mapService.normalizeMapData(map7);
test('Real-world: Array dimensions correct (10x2)', map7.tiles.length === 2 && map7.tiles[0].length === 10);
test('Real-world: Plain numbers preserved', map7.tiles[0][0] === 0 && map7.tiles[0][3] === 21);
test('Real-world: Underscore tiles preserved', map7.tiles[0][5] === '36_1' && map7.tiles[0][8] === '21_1');
test('Real-world: Second row underscore tiles preserved', map7.tiles[1][0] === '36_2' && map7.tiles[1][2] === '21_1');

// Summary
console.log(`\n=== Test Results ===`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log(`Total: ${passCount + failCount}`);

if (failCount === 0) {
  console.log('\n✓ All tests passed! Tile underscore notation is working correctly.');
  process.exit(0);
} else {
  console.log('\n✗ Some tests failed. Please review the implementation.');
  process.exit(1);
}
