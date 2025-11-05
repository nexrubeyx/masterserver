# Chunk-Based Player List and Chat Implementation

## Overview

This document describes the implementation of chunk-based (viewport-based) broadcasting for player lists and chat messages.

## Problem Statement

The original requirements (in Portuguese):
1. "na transmissão do pacote pkg pl p deve enviar todos os jogadores que estão dentro da mesma chunk até os mesmos jogadores que não estão se movendo"
   - Translation: In the transmission of the pkg pl p packet, it should send all players that are within the same chunk, even players that are not moving

2. "o chat 0 também só deve funcionar dentro da chunk"
   - Translation: Chat 0 (local chat) should also only function within the chunk

## Previous Behavior

### Player List Packets
- `flushPendingSnapshots()` only sent players with `_pendingSnapshot` flag (players that moved)
- Stationary players within the chunk were excluded from the packet
- This could cause issues where stationary players might not appear or update properly for others in the same chunk

### Chat
- Local chat (channel 0) broadcasted to ALL players in the same map using `broadcastInMap()`
- Players far away on the same map could receive messages they shouldn't see
- No proximity-based filtering for local chat

## New Implementation

### 1. Player List Packets - ALL Players in Chunk

**File**: `src/services/playerService.js`

**Method**: `flushPendingSnapshots()`

**Changes**:
- When any player in a map has a pending snapshot (movement update), the system now sends **ALL players within the viewport/chunk** in the "pl" packet, not just the ones that moved
- This ensures that:
  - Stationary players remain visible to others in the same chunk
  - The client has a complete and accurate representation of all players in the viewport
  - No player "disappears" due to not moving

**Logic**:
```javascript
// Collect maps that had updates
const mapsWithUpdates = new Set();
for (const player of this.world.players.values()) {
  if (player._pendingSnapshot) {
    mapsWithUpdates.add(player.mapId);
  }
}

// For each map with updates
for (const mapId of mapsWithUpdates) {
  const allPlayersInMap = this.world.getPlayersInMap(mapId);
  
  // For each receiver
  for (const receiver of allPlayersInMap) {
    // Send ALL visible players, not just moving ones
    const visiblePlayers = allPlayersInMap.filter(player => {
      return this.isPlayerInViewRange(receiver, player);
    });
    
    // Send pl packet with ALL visible players
    if (visiblePlayers.length > 0) {
      // ... send packet
    }
  }
}
```

### 2. Chunk-Based Chat Broadcasting

**File**: `src/state/world.js`

**New Method**: `broadcastInChunk(player, obj)`

A new broadcasting method that sends messages only to players within the viewport/chunk of the sender:

```javascript
broadcastInChunk(player, obj) {
  if (!player || !player.mapId) return;
  
  for (const [ws, session] of this.sessions) {
    // Skip if not in same map
    if (session.player.mapId !== player.mapId) continue;
    
    // Check if within visible range (chunk)
    if (this.playerService.isPlayerInViewRange(player, session.player)) {
      this.sendRaw(ws, obj);
    }
  }
}
```

**File**: `src/services/chatService.js`

**Method**: `handleChat()`

**Changes**:
- Local chat (channel 0) now uses `broadcastInChunk()` instead of `broadcastInMap()`
- Only players within the viewport range receive the message
- Global chat (`/b` command) continues to use `broadcastAll()`

## Viewport/Chunk Configuration

The chunk/viewport size is defined by environment variables:

```env
MAP_VIEW_RADIUS_X=18  # 18 tiles in X direction
MAP_VIEW_RADIUS_Y=13  # 13 tiles in Y direction
```

This creates a viewport of:
- Width: 36 tiles (2 * 18)
- Height: 26 tiles (2 * 13)

Players are considered "in range" if their Manhattan distance is within these radii:
- `|playerA.x - playerB.x| <= 18`
- `|playerA.y - playerB.y| <= 13`

## Testing

A test script `test-chunk-broadcast.js` verifies:
1. ✅ Stationary players within chunk are included in pl packets
2. ✅ Chat messages are restricted to players within chunk
3. ✅ Distant players (outside viewport) are excluded

Run the test:
```bash
node test-chunk-broadcast.js
```

## Examples

### Example 1: Player List Update

**Scenario**: Player1 at (50, 50) moves. Other players:
- Player2 at (52, 51) - stationary, within chunk
- Player3 at (100, 100) - stationary, far away
- Player4 at (55, 55) - stationary, within chunk

**Result**:
- Player1, Player2, and Player4 all receive a "pl" packet with ALL 3 players (including stationary ones)
- Player3 receives a "pl" packet with only themselves (no one else in range)

### Example 2: Chat Message

**Scenario**: Player1 at (50, 50) sends a local chat message

**Result**:
- Player1, Player2, and Player4 receive the message (within viewport)
- Player3 does NOT receive the message (outside viewport)

## Benefits

1. **Better Synchronization**: All players in a chunk are always aware of each other, even when stationary
2. **Realistic Chat**: Local chat behaves like proximity voice chat in real life
3. **Consistency**: Client always has complete information about their visible area
4. **Performance**: No change in performance characteristics; still uses the same viewport filtering

## Backward Compatibility

- ✅ Global chat (`/b`) still works as before
- ✅ Player templates continue to be sent on login
- ✅ Viewport system unchanged
- ✅ Rate limiting preserved
- ✅ All existing functionality maintained

## Related Files

- `src/services/playerService.js` - Player list broadcasting logic
- `src/services/chatService.js` - Chat message handling
- `src/state/world.js` - Broadcasting methods
- `test-chunk-broadcast.js` - Test script

## Migration Notes

No migration needed. The changes are backward compatible and take effect immediately when the server is restarted with the updated code.
