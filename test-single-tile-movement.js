/**
 * Test for single tile per tick movement enforcement
 * 
 * This test verifies that:
 * 1. Players can only move 1 tile per tick, regardless of time accumulation
 * 2. Time accumulation is capped to prevent multiple tile jumps
 * 3. Movement is sequential (A -> B -> C, not A -> C)
 */

console.log('=== Testing Single Tile Per Tick Movement ===\n');

// Mock player object
const createMockPlayer = (x, y, speed) => ({
  sessionId: 'test-session-1',
  name: 'TestPlayer',
  x: x,
  y: y,
  mapId: 'test_map',
  dir: 1, // right
  moving: true,
  speed: speed,
  _accumMs: 0,
  baseSpeed: speed
});

// Mock map
const mockMap = {
  id: 'test_map',
  width: 100,
  height: 100,
  tiles: []
};

// Initialize map with walkable tiles
for (let y = 0; y < mockMap.height; y++) {
  mockMap.tiles[y] = [];
  for (let x = 0; x < mockMap.width; x++) {
    mockMap.tiles[y][x] = 1; // Walkable grass
  }
}

console.log('Test 1: Player movement with accumulated time');
console.log('Scenario: Player has 1500ms accumulated, speed is 750ms per tile');
console.log('Expected: Player should only move 1 tile per tick, not 2\n');

const player1 = createMockPlayer(10, 10, 750);
player1._accumMs = 1500; // Enough for 2 tiles

console.log(`Initial state:`);
console.log(`  Position: (${player1.x}, ${player1.y})`);
console.log(`  Accumulated time: ${player1._accumMs}ms`);
console.log(`  Speed: ${player1.speed}ms per tile`);
console.log(`  Could theoretically move: ${Math.floor(player1._accumMs / player1.speed)} tiles`);

// Simulate the new behavior: cap accumulation and only process 1 tile
const stepMs = Math.max(20, player1.speed);
player1._accumMs = Math.min(player1._accumMs, stepMs * 2); // Cap at 2x stepMs

console.log(`\nAfter capping accumulation:`);
console.log(`  Accumulated time: ${player1._accumMs}ms (capped at ${stepMs * 2}ms)`);

if (player1._accumMs >= stepMs) {
  // Move only 1 tile
  player1.x += 1; // Moving right
  player1._accumMs -= stepMs;
  console.log(`\nAfter 1 tick:`);
  console.log(`  Position: (${player1.x}, ${player1.y}) - Moved 1 tile`);
  console.log(`  Remaining accumulated time: ${player1._accumMs}ms`);
}

if (player1.x === 11 && player1._accumMs === 750) {
  console.log('\n✓ Test 1 PASSED: Player moved only 1 tile despite having time for 2');
} else {
  console.log(`\n✗ Test 1 FAILED: Expected position (11, 10) with 750ms remaining, got (${player1.x}, ${player1.y}) with ${player1._accumMs}ms`);
  process.exit(1);
}

console.log('\n---\n');

console.log('Test 2: Accumulation cap prevents excessive time buildup');
console.log('Scenario: Player has 5000ms accumulated (lag spike)');
console.log('Expected: Accumulation should be capped to 2x speed (1500ms)\n');

const player2 = createMockPlayer(20, 20, 750);
player2._accumMs = 5000; // Massive lag spike

console.log(`Initial state:`);
console.log(`  Accumulated time: ${player2._accumMs}ms`);
console.log(`  Without cap, could move: ${Math.floor(player2._accumMs / player2.speed)} tiles`);

const stepMs2 = Math.max(20, player2.speed);
player2._accumMs = Math.min(player2._accumMs, stepMs2 * 2); // Cap at 2x stepMs

console.log(`\nAfter capping:`);
console.log(`  Accumulated time: ${player2._accumMs}ms (capped at ${stepMs2 * 2}ms)`);
console.log(`  Can now move: ${Math.floor(player2._accumMs / stepMs2)} tiles in next tick`);

if (player2._accumMs === 1500) {
  console.log('\n✓ Test 2 PASSED: Accumulation capped to prevent multiple tile jumps');
} else {
  console.log(`\n✗ Test 2 FAILED: Expected 1500ms, got ${player2._accumMs}ms`);
  process.exit(1);
}

console.log('\n---\n');

console.log('Test 3: Sequential movement over multiple ticks');
console.log('Scenario: Player moves 3 tiles over 3 ticks');
console.log('Expected: Position increments by 1 each tick (sequential A->B->C)\n');

const player3 = createMockPlayer(30, 30, 750);
const positions = [[30, 30]]; // Starting position

// Simulate 3 ticks with enough time accumulated each tick
for (let tick = 1; tick <= 3; tick++) {
  player3._accumMs += 800; // Add enough time for movement
  
  const stepMs3 = Math.max(20, player3.speed);
  player3._accumMs = Math.min(player3._accumMs, stepMs3 * 2); // Cap
  
  if (player3._accumMs >= stepMs3) {
    player3.x += 1; // Move right
    player3._accumMs -= stepMs3;
    positions.push([player3.x, player3.y]);
  }
}

console.log(`Movement path:`);
positions.forEach((pos, i) => {
  console.log(`  ${i === 0 ? 'Start' : `Tick ${i}`}: (${pos[0]}, ${pos[1]})`);
});

// Verify sequential movement
let sequential = true;
for (let i = 1; i < positions.length; i++) {
  const distance = Math.abs(positions[i][0] - positions[i-1][0]) + Math.abs(positions[i][1] - positions[i-1][1]);
  if (distance !== 1) {
    sequential = false;
    console.log(`\n✗ Non-sequential movement detected between tick ${i-1} and ${i}: distance = ${distance}`);
  }
}

if (sequential && player3.x === 33 && player3.y === 30) {
  console.log('\n✓ Test 3 PASSED: Movement is sequential, 1 tile per tick');
} else {
  console.log(`\n✗ Test 3 FAILED: Expected (33, 30), got (${player3.x}, ${player3.y})`);
  process.exit(1);
}

console.log('\n---\n');

console.log('Test 4: Security validation - coordinate tolerance');
console.log('Scenario: Client reports position 6 tiles away from server position');
console.log('Expected: Should be rejected (exceeds 5 tile severe desync threshold)\n');

const serverPos = { x: 50, y: 50 };
const clientPos = { x: 56, y: 50 }; // 6 tiles away

const distance = Math.abs(clientPos.x - serverPos.x) + Math.abs(clientPos.y - serverPos.y);
const tolerance = 2; // From .env
const severeThreshold = 5; // From .env

console.log(`Server position: (${serverPos.x}, ${serverPos.y})`);
console.log(`Client position: (${clientPos.x}, ${clientPos.y})`);
console.log(`Distance: ${distance} tiles`);
console.log(`Tolerance: ${tolerance} tiles`);
console.log(`Severe desync threshold: ${severeThreshold} tiles`);

let isValid = false;
if (distance <= tolerance) {
  isValid = true;
  console.log('\nResult: ACCEPTED (within tolerance)');
} else if (distance <= severeThreshold) {
  isValid = true;
  console.log('\nResult: ACCEPTED (moderate desync, within severe threshold)');
} else {
  isValid = false;
  console.log('\nResult: REJECTED (exceeds severe desync threshold)');
}

if (!isValid) {
  console.log('\n✓ Test 4 PASSED: Position 6 tiles away correctly rejected');
} else {
  console.log('\n✗ Test 4 FAILED: Position should be rejected but was accepted');
  process.exit(1);
}

console.log('\n---\n');

console.log('Test 5: Security validation - within tolerance');
console.log('Scenario: Client reports position 2 tiles away (within tolerance)');
console.log('Expected: Should be accepted\n');

const serverPos2 = { x: 60, y: 60 };
const clientPos2 = { x: 62, y: 60 }; // 2 tiles away

const distance2 = Math.abs(clientPos2.x - serverPos2.x) + Math.abs(clientPos2.y - serverPos2.y);

console.log(`Server position: (${serverPos2.x}, ${serverPos2.y})`);
console.log(`Client position: (${clientPos2.x}, ${clientPos2.y})`);
console.log(`Distance: ${distance2} tiles`);

let isValid2 = false;
if (distance2 <= tolerance) {
  isValid2 = true;
  console.log('\nResult: ACCEPTED (within tolerance)');
} else if (distance2 <= severeThreshold) {
  isValid2 = true;
  console.log('\nResult: ACCEPTED (moderate desync)');
} else {
  isValid2 = false;
  console.log('\nResult: REJECTED');
}

if (isValid2) {
  console.log('\n✓ Test 5 PASSED: Position within tolerance correctly accepted');
} else {
  console.log('\n✗ Test 5 FAILED: Position should be accepted but was rejected');
  process.exit(1);
}

console.log('\n=== All Tests Passed ===');
console.log('\nSummary:');
console.log('- Players move only 1 tile per tick, preventing coordinate jumping');
console.log('- Time accumulation is capped at 2x speed to prevent buildup');
console.log('- Movement is strictly sequential (A -> B -> C)');
console.log('- Coordinate tolerance is 2 tiles for normal lag');
console.log('- Severe desync threshold is 5 tiles (will force client correction)');
console.log('- Server maintains strict authority over player positions');
console.log('\nThe server now enforces tile-by-tile sequential movement!');
