/**
 * Test script for chunk loading when player approaches borders
 * 
 * This test verifies that:
 * 1. Players far from borders use normal viewport size
 * 2. Players near borders use larger chunk size
 * 3. Chunk loading is properly triggered based on CHUNK_BORDER_THRESHOLD
 */

import { loadEnv } from './src/config/env.js';

// Mock logger
const logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {}
};

// Mock world with mapService
const mockWorld = {
  mapService: {
    getMap: (mapId) => ({
      id: mapId,
      width: 100,
      height: 100,
      tiles: Array(100).fill(null).map(() => Array(100).fill(0))
    }),
    buildViewportPayload: (map, x, y, rx, ry) => {
      // Just return a mock payload
      return `viewport:${x}:${y}:${rx}:${ry}`;
    }
  },
  sendTo: () => {}
};

// Load environment
const env = loadEnv();

// Import PlayerService after env is loaded
const { PlayerService } = await import('./src/services/playerService.js');

// Create service instance
const playerService = new PlayerService(env, logger, mockWorld);

// Test cases
console.log('Testing Chunk Loading Feature\n');
console.log('Configuration:');
console.log(`  Viewport: ${env.MAP_VIEW_RADIUS_X}x${env.MAP_VIEW_RADIUS_Y} (radius)`);
console.log(`  Chunk: ${env.MAP_CHUNK_RADIUS_X}x${env.MAP_CHUNK_RADIUS_Y} (radius)`);
console.log(`  Border Threshold: ${env.CHUNK_BORDER_THRESHOLD} tiles\n`);

// Create mock players at different positions
const testCases = [
  { name: 'Center of map', x: 50, y: 50, expectedChunk: false },
  { name: 'Near top border', x: 50, y: 5, expectedChunk: true },
  { name: 'Near bottom border', x: 50, y: 95, expectedChunk: true },
  { name: 'Near left border', x: 5, y: 50, expectedChunk: true },
  { name: 'Near right border', x: 95, y: 50, expectedChunk: true },
  { name: 'Near top-left corner', x: 5, y: 5, expectedChunk: true },
  { name: 'Just outside threshold', x: 15, y: 50, expectedChunk: false },
  { name: 'Just inside threshold', x: 9, y: 50, expectedChunk: true }
];

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const player = {
    mapId: 'test',
    x: testCase.x,
    y: testCase.y,
    sessionId: 1
  };
  
  const map = mockWorld.mapService.getMap(player.mapId);
  const isNear = playerService._isNearBorder(player, map);
  
  const status = isNear === testCase.expectedChunk ? '✓ PASS' : '✗ FAIL';
  if (isNear === testCase.expectedChunk) {
    passed++;
  } else {
    failed++;
  }
  
  console.log(`${status}: ${testCase.name} (${testCase.x}, ${testCase.y})`);
  console.log(`  Expected chunk loading: ${testCase.expectedChunk}, Got: ${isNear}`);
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('✓ All tests passed!');
  process.exit(0);
} else {
  console.log('✗ Some tests failed!');
  process.exit(1);
}
