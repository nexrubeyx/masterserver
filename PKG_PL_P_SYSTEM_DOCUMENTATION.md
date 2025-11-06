# PKG > PL > P Packet System Configuration

## Overview

This document describes the packet hierarchy system implemented in the server to properly structure player position updates. The system ensures that player snapshots (`p` packets) are contained within player list packets (`pl`), which are in turn wrapped in package packets (`pkg`).

## Packet Hierarchy

The correct packet hierarchy is:

```
pkg (package)
 └─ pl (player list)
     └─ p (player snapshot)
         └─ p (player snapshot)
         └─ ... (more players)
```

### Example Structure

```json
{
  "type": "pkg",
  "data": "[{\"type\":\"pl\",\"data\":[\"{\\\"type\\\":\\\"p\\\",\\\"id\\\":39094,\\\"tpl\\\":39094,\\\"s\\\":323,\\\"d\\\":3,\\\"x\\\":46,\\\"y\\\":8,\\\"dx\\\":43,\\\"dy\\\":15}\",\"{\\\"type\\\":\\\"p\\\",\\\"id\\\":1002,...}\"]}]"
}
```

## Implementation Details

### Auto-Wrapping System

The server implements an automatic wrapping system in `world.js:sendRaw()` that:

1. **Auto-wraps `pl` packets in `pkg`**: When a `pl` packet is sent, it's automatically wrapped in a `pkg` packet
2. **Auto-adds `pl` to empty `pkg`**: When an empty or non-`pl` containing `pkg` is sent, a `pl` packet with visible players is automatically added
3. **Prevents duplication**: Checks if a `pl` packet already exists in a `pkg` before adding another one

### Key Functions

#### `sendRaw(ws, obj)` in `world.js`

This function handles all outgoing packets and implements the auto-wrapping logic:

```javascript
// If packet is type 'pl', wrap it in 'pkg'
if (obj && obj.type === 'pl' && Array.isArray(obj.data)) {
  obj = {
    type: 'pkg',
    data: JSON.stringify([JSON.stringify(obj)])
  };
}

// If packet is type 'pkg', add 'pl' if not already present
if (obj && obj.type === 'pkg' && typeof obj.data === 'string') {
  // Check if 'pl' already exists in the pkg
  // If not, add it with visible players
}
```

#### `flushPendingSnapshots()` in `playerService.js`

Sends player position updates:

```javascript
// Create pl packet with visible players
const plPacket = {
  type: 'pl',
  data: plData  // Array of stringified 'p' packets
};

// Send pl packet directly - sendRaw will auto-wrap it in pkg
this.world.sendTo(receiver, plPacket);
```

### Player Snapshot Format ('p' packet)

Each player snapshot contains:

```javascript
{
  type: 'p',       // Packet type
  id: 39094,       // Session ID
  tpl: 39094,      // Template ID (same as session ID for players)
  s: 323,          // Speed in milliseconds per tile
  d: 3,            // Direction (0=up, 1=right, 2=down, 3=left)
  x: 46,           // Current X position
  y: 8,            // Current Y position
  dx: 43,          // Destination X (next tile if moving)
  dy: 15,          // Destination Y (next tile if moving)
  ch: 0            // Channel (always 0)
}
```

### Direction Field ('d')

The `d` field represents the player's facing direction:
- `0` = North (up)
- `1` = East (right)
- `2` = South (down)
- `3` = West (left)

When a player moves, the direction changes to reflect where they're heading, and `dx/dy` fields point to the next tile they're moving towards.

## Changes Made

### Fixed Issues

1. **Eliminated Duplication**: Previously, `flushPendingSnapshots()` manually wrapped `pl` in `pkg`, and then `sendRaw()` added another `pl`, causing duplication.

2. **Consistent Hierarchy**: All player list updates now follow the `pkg > pl > p` hierarchy consistently.

3. **Simplified Code**: Removed manual `pkg` wrapping throughout the codebase, relying on auto-wrapping instead.

### Modified Functions

#### `src/state/world.js`
- `sendRaw()`: Added auto-wrapping for `pl` packets and duplication prevention
- `broadcastPlayersListToMap()`: Now sends `pl` directly instead of wrapping in `pkg`
- `_reconcileAllPlayerPositions()`: Sends `pl` directly
- `syncPresence()`: Sends `pl` directly
- `finalizeDisconnect()`: Already manually creates `pkg` with multiple items including `pl`

#### `src/services/playerService.js`
- `flushPendingSnapshots()`: Sends `pl` directly instead of wrapping in `pkg`

## Testing

### Test File: `test-pkg-pl-p-structure.js`

Verifies:
1. ✅ `pl` packets are automatically wrapped in `pkg`
2. ✅ `p` packets are correctly inside `pl` packets
3. ✅ No duplication of `pl` packets occurs
4. ✅ Empty `pkg` packets get `pl` auto-added
5. ✅ `pkg` packets with existing `pl` don't get duplicates

### Existing Tests
All existing tests continue to pass:
- ✅ `test-chunk-broadcast.js` - Chunk-based player list broadcasting
- ✅ `test-coordinate-synchronization.js` - dx/dy coordinate synchronization
- ✅ `test-single-tile-movement.js` - Sequential tile-by-tile movement

## Usage Examples

### Sending Player Updates

```javascript
// Create pl packet with player snapshots
const plPacket = {
  type: 'pl',
  data: [
    JSON.stringify({ type: 'p', id: 1001, x: 50, y: 50, ... }),
    JSON.stringify({ type: 'p', id: 1002, x: 52, y: 51, ... })
  ]
};

// Send it - will be auto-wrapped in pkg
world.sendTo(player, plPacket);

// Result sent to client:
// {
//   type: 'pkg',
//   data: "[{\"type\":\"pl\",\"data\":[...]}]"
// }
```

### Sending Other Data with Player List

```javascript
// Create pkg with multiple items
const pkgPacket = {
  type: 'pkg',
  data: JSON.stringify([
    JSON.stringify({ type: 'message', text: 'Hello!' }),
    JSON.stringify({ type: 'fx', tpl: 'explosion', x: 10, y: 20 })
  ])
};

// Send it - pl packet will be auto-added at the beginning
world.sendTo(player, pkgPacket);

// Result sent to client:
// {
//   type: 'pkg',
//   data: "[{\"type\":\"pl\",\"data\":[...]}, {\"type\":\"message\",...}, {\"type\":\"fx\",...}]"
// }
```

## Benefits

1. **Consistency**: All player updates follow the same packet structure
2. **No Duplication**: Automatic detection prevents duplicate `pl` packets
3. **Simplified Code**: No need to manually wrap packets throughout the codebase
4. **Client Compatibility**: Matches the expected packet format from the client
5. **Maintainability**: Centralized packet wrapping logic in `sendRaw()`

## Client Integration

The client should parse packets in this order:

1. Parse the outer `pkg` packet
2. Parse the `data` array to get stringified sub-packets
3. Parse each sub-packet to find `pl` packets
4. Parse the `data` array in `pl` to get stringified player snapshots
5. Parse each player snapshot to get individual `p` packets with player positions

Example client-side parsing:

```javascript
// Receive pkg packet
const pkg = JSON.parse(wsMessage);
if (pkg.type === 'pkg') {
  const subPackets = JSON.parse(pkg.data);
  
  for (const subPacketStr of subPackets) {
    const subPacket = JSON.parse(subPacketStr);
    
    if (subPacket.type === 'pl') {
      // Found player list
      for (const playerStr of subPacket.data) {
        const player = JSON.parse(playerStr);
        // player.type === 'p'
        // Update player position: player.x, player.y, player.dx, player.dy
      }
    }
  }
}
```

## Configuration

The system uses these environment variables:

```env
# Viewport/chunk radius (determines which players see each other)
MAP_VIEW_RADIUS_X=18
MAP_VIEW_RADIUS_Y=13

# How often to send position updates (max frequency)
SNAPSHOT_MAX_HZ=20

# Game loop tick interval
TICK_MS=50
```

## Performance

- **Batching**: Player updates are batched per tick, reducing packet count
- **Filtering**: Only visible players (within viewport) are included in `pl` packets
- **Duplication Prevention**: Avoids sending redundant data
- **Efficient**: O(n²) filtering per map is acceptable for typical player counts (<100 per map)

## Future Optimizations

For servers with very high player counts per map (>100), consider:
1. Spatial indexing (quadtree) for O(1) visibility lookups
2. Interest management zones
3. Delta compression for position updates
4. Adaptive update rates based on player activity
