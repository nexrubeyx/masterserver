/**
 * Test suite for sendToAllInMap method
 * 
 * Validates that the World class has the sendToAllInMap method
 * and that it works correctly.
 */

import { World } from './src/state/world.js';

console.log('=== sendToAllInMap Method - Test Suite ===\n');

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

// Test 1: World class exists
test('World class exists', typeof World === 'function');

// Test 2: World class can be instantiated (with minimal env and logger)
const mockEnv = { 
  TICK_MS: 50, 
  DEFAULT_LEVEL: 1,
  SLEEP_TIMEOUT_MS: 60000
};
const mockLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {}
};

let worldInstance;
try {
  worldInstance = new World(mockEnv, mockLogger);
  test('World instance can be created', true);
} catch (e) {
  test('World instance can be created', false);
  console.error('Error creating World instance:', e.message);
}

// Test 3: sendToAllInMap method exists
test('sendToAllInMap method exists', typeof worldInstance?.sendToAllInMap === 'function');

// Test 4: sendToOthersInMap method exists (for comparison)
test('sendToOthersInMap method exists', typeof worldInstance?.sendToOthersInMap === 'function');

// Test 5: Method signature check (accepts player and obj parameters)
if (worldInstance?.sendToAllInMap) {
  const methodString = worldInstance.sendToAllInMap.toString();
  test('sendToAllInMap has expected parameters', methodString.includes('player') && methodString.includes('obj'));
}

// Test 6: Method can be called without throwing (even with empty sessions)
try {
  const mockPlayer = { mapId: 'test-map', sessionId: '1001' };
  const mockPacket = { type: 'test', data: 'test' };
  worldInstance.sendToAllInMap(mockPlayer, mockPacket);
  test('sendToAllInMap can be called without errors', true);
} catch (e) {
  test('sendToAllInMap can be called without errors', false);
  console.error('Error calling sendToAllInMap:', e.message);
}

// Summary
console.log(`\n=== Test Summary ===`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log(`Total: ${passCount + failCount}`);

if (failCount > 0) {
  process.exit(1);
}
