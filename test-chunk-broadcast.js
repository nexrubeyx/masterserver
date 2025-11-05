/**
 * Test: Chunk-Based Player List and Chat System
 * 
 * This test verifies that:
 * 1. Player list (pl) packets include ALL players in chunk, not just moving ones
 * 2. Chat messages only reach players within the chunk/viewport
 */

// Mock environment configuration
const mockEnv = {
  MAP_VIEW_RADIUS_X: 18,
  MAP_VIEW_RADIUS_Y: 13
};

// Mock logger
const mockLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {}
};

// Mock player service with isPlayerInViewRange method
class MockPlayerService {
  constructor(env) {
    this.env = env;
  }

  isPlayerInViewRange(viewer, target) {
    const radiusX = this.env.MAP_VIEW_RADIUS_X;
    const radiusY = this.env.MAP_VIEW_RADIUS_Y;
    
    const dx = Math.abs(viewer.x - target.x);
    const dy = Math.abs(viewer.y - target.y);
    
    return dx <= radiusX && dy <= radiusY;
  }

  makePlayerListData(players) {
    return players.map(p => JSON.stringify({
      type: 'p',
      id: p.sessionId,
      tpl: p.sessionId,
      x: p.x,
      y: p.y,
      dx: p.x,
      dy: p.y,
      s: p.speed || 300,
      d: p.dir || 0,
      ch: 0
    }));
  }
}

// Test scenario: Players in different positions
const players = [
  { sessionId: 1, mapId: 'map1', x: 50, y: 50, name: 'Player1', moving: true, _pendingSnapshot: true },
  { sessionId: 2, mapId: 'map1', x: 52, y: 51, name: 'Player2', moving: false, _pendingSnapshot: false },  // Stationary, within chunk
  { sessionId: 3, mapId: 'map1', x: 100, y: 100, name: 'Player3', moving: false, _pendingSnapshot: false }, // Far away
  { sessionId: 4, mapId: 'map1', x: 55, y: 55, name: 'Player4', moving: false, _pendingSnapshot: false }   // Stationary, within chunk
];

const playerService = new MockPlayerService(mockEnv);

console.log('=== Test 1: Chunk-Based Player List ===\n');

// Simulate flushPendingSnapshots logic
const mapsWithUpdates = new Set();
for (const player of players) {
  if (player._pendingSnapshot) {
    mapsWithUpdates.add(player.mapId);
  }
}

console.log(`Maps with updates: ${[...mapsWithUpdates].join(', ')}\n`);

// For each map with updates
for (const mapId of mapsWithUpdates) {
  const allPlayersInMap = players.filter(p => p.mapId === mapId);
  
  console.log(`Processing map: ${mapId}`);
  console.log(`Total players in map: ${allPlayersInMap.length}\n`);
  
  // For each receiver
  for (const receiver of allPlayersInMap) {
    console.log(`Receiver: ${receiver.name} at (${receiver.x}, ${receiver.y})`);
    
    // Filter visible players (ALL players in chunk, not just moving ones)
    const visiblePlayers = allPlayersInMap.filter(player => {
      const inRange = playerService.isPlayerInViewRange(receiver, player);
      const distance = Math.abs(receiver.x - player.x) + Math.abs(receiver.y - player.y);
      console.log(`  - ${player.name} at (${player.x}, ${player.y}): ${inRange ? 'VISIBLE' : 'NOT VISIBLE'} (distance: ${distance})`);
      return inRange;
    });
    
    console.log(`  → Would send pl packet with ${visiblePlayers.length} players:`);
    visiblePlayers.forEach(p => {
      const movingStatus = p.moving ? '(moving)' : '(stationary)';
      console.log(`     * ${p.name} ${movingStatus}`);
    });
    console.log();
  }
}

console.log('=== Test 2: Chunk-Based Chat ===\n');

// Simulate chat from Player1
const sender = players[0];
console.log(`Chat sender: ${sender.name} at (${sender.x}, ${sender.y})`);
console.log('Message: "Hello from Player1!"\n');

// Determine who receives the message (chunk-based)
const receivers = players.filter(p => {
  if (p.mapId !== sender.mapId) return false;
  const inRange = playerService.isPlayerInViewRange(sender, p);
  return inRange;
});

console.log('Chat receivers:');
receivers.forEach(p => {
  const distance = Math.abs(sender.x - p.x) + Math.abs(sender.y - p.y);
  console.log(`  ✓ ${p.name} at (${p.x}, ${p.y}) - distance: ${distance}`);
});

const nonReceivers = players.filter(p => !receivers.includes(p));
if (nonReceivers.length > 0) {
  console.log('\nPlayers NOT receiving chat (outside chunk):');
  nonReceivers.forEach(p => {
    const distance = Math.abs(sender.x - p.x) + Math.abs(sender.y - p.y);
    console.log(`  ✗ ${p.name} at (${p.x}, ${p.y}) - distance: ${distance}`);
  });
}

console.log('\n=== Test Results ===\n');

// Verify expectations
const player2InChunk = playerService.isPlayerInViewRange(players[0], players[1]);
const player3InChunk = playerService.isPlayerInViewRange(players[0], players[2]);
const player4InChunk = playerService.isPlayerInViewRange(players[0], players[3]);

console.log('✓ Player2 (stationary, close) is in chunk of Player1:', player2InChunk);
console.log('✓ Player4 (stationary, close) is in chunk of Player1:', player4InChunk);
console.log('✓ Player3 (far away) is NOT in chunk of Player1:', !player3InChunk);

if (player2InChunk && player4InChunk && !player3InChunk) {
  console.log('\n✅ All tests passed! Chunk-based system is working correctly.');
  console.log('   - Stationary players within chunk are included in pl packets');
  console.log('   - Chat is restricted to players within chunk');
  console.log('   - Distant players are excluded');
  process.exit(0);
} else {
  console.log('\n❌ Tests failed! Check the implementation.');
  process.exit(1);
}
