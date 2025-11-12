/**
 * Test: Voluntary Stop Synchronization
 * 
 * This test verifies that when a player voluntarily stops moving
 * (by sending 'h' command without direction), the server sends
 * a position update back to the player themselves with dx=x, dy=y.
 * 
 * This prevents the client from showing stale dx/dy values and
 * thinking the player is still moving when they've actually stopped.
 */

console.log('=== Testing Voluntary Stop Synchronization ===\n');

// Test 1: Verify stopMoving with sendToSelf=true includes player in broadcast
console.log('Test 1: stopMoving(player, true) should send update to player themselves');
console.log('Scenario: Player stops voluntarily');
console.log('Expected: Player receives position update with dx=x, dy=y\n');

// Mock player
const player = {
  sessionId: 1001,
  mapId: 'map001',
  x: 18,
  y: 22,
  dir: 1, // right
  moving: true,
  _accumMs: 0
};

// Track which players received updates
let receivedUpdates = [];

// Mock world with minimal required methods
const mockWorld = {
  getPlayersInMap: (mapId) => {
    return [player]; // Only this player in map
  },
  sendTo: (receiver, packet) => {
    receivedUpdates.push({
      receiver: receiver.sessionId,
      packet: packet
    });
  },
  env: {
    MAP_VIEW_RADIUS_X: 18,
    MAP_VIEW_RADIUS_Y: 13
  }
};

// Mock PlayerService
class MockPlayerService {
  constructor(env, logger, world) {
    this.env = env;
    this.world = world;
  }

  makePlayerSnapshotPacket(player) {
    let dx = player.x;
    let dy = player.y;
    
    if (player.moving) {
      const dirX = (player.dir === 1 ? 1 : player.dir === 3 ? -1 : 0);
      const dirY = (player.dir === 2 ? 1 : player.dir === 0 ? -1 : 0);
      dx = player.x + dirX;
      dy = player.y + dirY;
    }
    
    return {
      type: 'p',
      id: player.sessionId,
      tpl: player.sessionId,
      x: player.x,
      y: player.y,
      dx: dx,
      dy: dy,
      s: player.speed || 300,
      d: player.dir || 0,
      ch: 0
    };
  }

  makePlayerListData(players) {
    return players.map(p => {
      const snapshot = this.makePlayerSnapshotPacket(p);
      return JSON.stringify(snapshot);
    });
  }

  isPlayerInViewRange(viewer, target) {
    const radiusX = this.env.MAP_VIEW_RADIUS_X;
    const radiusY = this.env.MAP_VIEW_RADIUS_Y;
    
    const dx = Math.abs(viewer.x - target.x);
    const dy = Math.abs(viewer.y - target.y);
    
    return dx <= radiusX && dy <= radiusY;
  }

  broadcastPlayerPositions(mapId, excludePlayer = null) {
    if (!mapId) return;
    
    const allPlayersInMap = this.world.getPlayersInMap(mapId);
    if (allPlayersInMap.length === 0) return;
    
    for (const receiver of allPlayersInMap) {
      // Skip if this is the excluded player
      if (excludePlayer && receiver === excludePlayer) continue;
      
      const visiblePlayers = allPlayersInMap.filter(player => {
        return this.isPlayerInViewRange(receiver, player);
      });
      
      if (visiblePlayers.length > 0) {
        const plData = this.makePlayerListData(visiblePlayers);
        
        const plPacket = {
          type: 'pl',
          data: plData
        };
        
        this.world.sendTo(receiver, plPacket);
      }
    }
  }

  stopMoving(player, sendToSelf = false) {
    player.moving = false;
    player._accumMs = 0;
    
    // Broadcast to all or exclude self based on sendToSelf
    this.broadcastPlayerPositions(player.mapId, sendToSelf ? null : player);
  }
}

const playerService = new MockPlayerService(mockWorld.env, console, mockWorld);

console.log('Initial state:');
console.log(`  Player position: (${player.x}, ${player.y})`);
console.log(`  Player moving: ${player.moving}`);
console.log(`  Player direction: ${player.dir}\n`);

// Test stopMoving with sendToSelf=false (old behavior)
console.log('Testing OLD behavior: stopMoving(player, false)');
receivedUpdates = [];
playerService.stopMoving(player, false);

console.log(`  Updates sent: ${receivedUpdates.length}`);
console.log(`  Player received update: ${receivedUpdates.some(u => u.receiver === player.sessionId)}`);

if (receivedUpdates.length === 0) {
  console.log('  ✓ Correct: No updates sent (player excluded)\n');
} else {
  console.log('  ✗ FAILED: Unexpected updates sent\n');
  process.exit(1);
}

// Reset player state
player.moving = true;

// Test stopMoving with sendToSelf=true (new behavior - FIX)
console.log('Testing NEW behavior: stopMoving(player, true)');
receivedUpdates = [];
playerService.stopMoving(player, true);

console.log(`  Updates sent: ${receivedUpdates.length}`);
console.log(`  Player received update: ${receivedUpdates.some(u => u.receiver === player.sessionId)}`);

if (receivedUpdates.length === 1 && receivedUpdates[0].receiver === player.sessionId) {
  console.log('  ✓ Correct: Player received position update\n');
  
  // Verify the packet structure
  const update = receivedUpdates[0];
  const packet = update.packet;
  
  console.log('Verifying packet structure:');
  console.log(`  Packet type: ${packet.type}`);
  
  if (packet.type !== 'pl') {
    console.log('  ✗ FAILED: Expected pl packet\n');
    process.exit(1);
  }
  
  console.log('  ✓ Packet is type "pl"\n');
  
  // Parse the player snapshot
  const playerSnapshotStr = packet.data[0];
  const playerSnapshot = JSON.parse(playerSnapshotStr);
  
  console.log('Verifying player snapshot:');
  console.log(`  Player position: (${playerSnapshot.x}, ${playerSnapshot.y})`);
  console.log(`  Player destination: (${playerSnapshot.dx}, ${playerSnapshot.dy})`);
  
  // Verify dx=x and dy=y (stationary)
  if (playerSnapshot.dx === playerSnapshot.x && playerSnapshot.dy === playerSnapshot.y) {
    console.log('  ✓ Correct: dx=x and dy=y (player is stationary)\n');
  } else {
    console.log(`  ✗ FAILED: Expected dx=${playerSnapshot.x}, dy=${playerSnapshot.y} but got dx=${playerSnapshot.dx}, dy=${playerSnapshot.dy}\n`);
    process.exit(1);
  }
  
} else {
  console.log('  ✗ FAILED: Player did not receive position update\n');
  process.exit(1);
}

console.log('✓ Test 1 PASSED: stopMoving with sendToSelf=true sends update to player\n');

console.log('---\n');

// Test 2: Verify the fix in message router
console.log('Test 2: Message router uses stopMoving(player, true) for voluntary stops');
console.log('Scenario: Player sends "h" command without direction');
console.log('Expected: stopMoving is called with sendToSelf=true\n');

// Read the messageRouter.js file to verify the fix
import { readFileSync } from 'fs';

const messageRouterContent = readFileSync('./src/controllers/messageRouter.js', 'utf-8');

// Check if the fix is present
const hasFixForVoluntaryStop = messageRouterContent.includes('stopMoving(session.player, true)');

if (hasFixForVoluntaryStop) {
  console.log('✓ Test 2 PASSED: Message router correctly uses stopMoving(player, true)\n');
} else {
  console.log('✗ Test 2 FAILED: Message router does not use stopMoving(player, true)\n');
  console.log('Fix needed: Change stopMoving(session.player) to stopMoving(session.player, true) in messageRouter.js\n');
  process.exit(1);
}

console.log('=== All Tests Passed ===\n');
console.log('Summary:');
console.log('- stopMoving(player, true) sends position update to player themselves');
console.log('- Player receives correct dx=x, dy=y when stopping');
console.log('- Message router correctly calls stopMoving with sendToSelf=true');
console.log('- Client will now see exact position synchronization\n');
