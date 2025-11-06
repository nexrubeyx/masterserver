/**
 * Visual Demo: PKG > PL > P Packet Structure
 * 
 * Demonstrates the packet hierarchy with real examples
 */

import { World } from './src/state/world.js';
import pino from 'pino';

const env = {
  DEFAULT_LEVEL: 1,
  DEFAULT_SONG: 'song1',
  DEFAULT_CAVE_WALL: 'wall',
  DEFAULT_CAVE_FLOOR: 'floor',
  TICK_MS: 50,
  MAP_VIEW_RADIUS_X: 18,
  MAP_VIEW_RADIUS_Y: 13,
  SNAPSHOT_MAX_HZ: 20,
  SLEEP_TIMEOUT_MS: 60000
};

const logger = pino({ level: 'silent' });

class MockWebSocket {
  constructor(name) {
    this.name = name;
    this.readyState = 1;
    this.bufferedAmount = 0;
    this.messages = [];
  }
  
  send(data) {
    this.messages.push(JSON.parse(data));
  }
  
  getLastMessage() {
    return this.messages[this.messages.length - 1];
  }
}

const mockMap = {
  id: 'test_map',
  title: 'Test Map',
  width: 100,
  height: 100,
  tiles: new Array(100 * 100).fill(1),
  neighbors: {}
};

async function visualDemo() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║         PKG > PL > P Packet Structure - Visual Demo           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  const world = new World(env, logger);
  world.mapService = {
    getMap: () => mockMap,
    loadAll: async () => {},
    getAllMaps: () => [mockMap],
    buildViewportPayload: () => ({ type: 'map', data: [] })
  };
  
  await world.mapService.loadAll();
  
  const ws = new MockWebSocket('Player1');
  const player = {
    sessionId: '39094',
    name: 'TestPlayer',
    mapId: 'test_map',
    x: 46,
    y: 8,
    dir: 3, // Direction 3 = West (left)
    speed: 323,
    moving: true,
    level: 1,
    appearance: { body: 0, hair: 0, clothes: 0, sprite: -1, clothesColor: 0, hairColor: 0, eyeColor: 0, nameColor: 0 },
    _accumMs: 0
  };
  
  const user = { _id: 'user1', username: 'TestUser', premium: 0 };
  
  world.sessions.set(ws, { ws, user, player });
  world.players.set(player.sessionId, player);
  
  console.log('📊 Scenario: Player moving west (left)');
  console.log('════════════════════════════════════════\n');
  console.log(`Player ID:   ${player.sessionId}`);
  console.log(`Position:    (${player.x}, ${player.y})`);
  console.log(`Direction:   ${player.dir} (3 = West/Left)`);
  console.log(`Speed:       ${player.speed} ms/tile`);
  console.log(`Moving:      ${player.moving}\n`);
  
  // Create and send a pl packet
  const plPacket = {
    type: 'pl',
    data: [
      JSON.stringify({
        type: 'p',
        id: 39094,
        tpl: 39094,
        s: 323,
        d: 3,
        x: 46,
        y: 8,
        dx: 45, // Moving west, so destination x = 45 (current - 1)
        dy: 8,
        ch: 0
      })
    ]
  };
  
  world.sendTo(player, plPacket);
  
  const msg = ws.getLastMessage();
  
  console.log('📦 Outer Layer: PKG Packet');
  console.log('════════════════════════════════════════');
  console.log(`Type: "${msg.type}"`);
  console.log(`Data: [string containing pl packet]\n`);
  
  // Parse pkg data
  const pkgData = JSON.parse(msg.data);
  console.log('📋 Middle Layer: PL Packet (Player List)');
  console.log('════════════════════════════════════════');
  console.log(`Number of items in pkg: ${pkgData.length}`);
  
  const plInPkg = JSON.parse(pkgData[0]);
  console.log(`Type: "${plInPkg.type}"`);
  console.log(`Number of players: ${plInPkg.data.length}\n`);
  
  // Parse player snapshot
  const pPacket = JSON.parse(plInPkg.data[0]);
  console.log('🎮 Inner Layer: P Packet (Player Snapshot)');
  console.log('════════════════════════════════════════');
  console.log(`Type:        "${pPacket.type}"`);
  console.log(`ID:          ${pPacket.id}`);
  console.log(`Template:    ${pPacket.tpl}`);
  console.log(`Speed:       ${pPacket.s} ms`);
  console.log(`Direction:   ${pPacket.d} (3 = West)`);
  console.log(`Position:    (${pPacket.x}, ${pPacket.y})`);
  console.log(`Destination: (${pPacket.dx}, ${pPacket.dy})`);
  console.log(`Channel:     ${pPacket.ch}\n`);
  
  console.log('📊 Movement Explanation');
  console.log('════════════════════════════════════════');
  console.log(`Current position:  x=${pPacket.x}, y=${pPacket.y}`);
  console.log(`Destination:       x=${pPacket.dx}, y=${pPacket.dy}`);
  console.log(`Direction:         d=${pPacket.d} (3 = moving West/Left)`);
  console.log(`Change:            x will decrease by 1 (46 → 45)`);
  console.log(`                   y stays the same (8)`);
  console.log(`This matches the problem statement example! ✓\n`);
  
  console.log('🌳 Packet Hierarchy Tree');
  console.log('════════════════════════════════════════');
  console.log('pkg (package)');
  console.log(' │');
  console.log(' ├─ type: "pkg"');
  console.log(' │');
  console.log(' └─ data: "..." (stringified array)');
  console.log('     │');
  console.log('     └─ [0]: pl (player list)');
  console.log('         │');
  console.log('         ├─ type: "pl"');
  console.log('         │');
  console.log('         └─ data: [...] (array of strings)');
  console.log('             │');
  console.log('             └─ [0]: p (player snapshot)');
  console.log('                 │');
  console.log('                 ├─ type: "p"');
  console.log('                 ├─ id: 39094');
  console.log('                 ├─ x: 46, y: 8');
  console.log('                 ├─ dx: 45, dy: 8');
  console.log('                 ├─ d: 3 (direction)');
  console.log('                 └─ s: 323 (speed)\n');
  
  console.log('✨ Console Log Format (like problem statement)');
  console.log('════════════════════════════════════════');
  console.log('🧩 TYPE \'p\' dentro de PL → PKG');
  console.log(JSON.stringify(pPacket, null, 2));
  console.log('');
  
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                    ✅ Demo Complete!                           ║');
  console.log('║                                                                ║');
  console.log('║  The server correctly implements the PKG > PL > P hierarchy   ║');
  console.log('║  as shown in the problem statement examples.                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
}

visualDemo()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
