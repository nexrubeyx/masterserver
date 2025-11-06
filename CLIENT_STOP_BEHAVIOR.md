# Client Stop Behavior Documentation

## Overview

This document describes the expected client behavior when a player stops moving, based on the server's requirements.

## Problem Statement (Portuguese)
"o client enviar um pacote {"type":"h","x":17,"y":23} quando ele realmente para corrija isso"

**Translation:**
"the client should send a packet {"type":"h","x":17,"y":23} when it really stops, fix this"

## Expected Client Behavior

### When Player Stops Moving

When the player releases the movement key and stops moving, the client MUST send an 'h' packet with:
- `type`: "h" (halt/movement command)
- `x`: current X coordinate
- `y`: current Y coordinate
- NO `d` field (or `d` is undefined/null)

### Example Stop Packet

```json
{
  "type": "h",
  "x": 17,
  "y": 23
}
```

Note: The absence of the `d` (direction) field indicates the player wants to STOP. If `d` is present with a value 0-3, it indicates starting movement in that direction.

## Server Validation

The server validates the coordinates in ALL 'h' packets, whether starting or stopping:

```javascript
// In messageRouter.js, case 'h':
const coordValidation = world.securityService.validateClientCoordinates(
  session.player,
  packet.x,
  packet.y
);

if (!coordValidation.valid) {
  // Resynchronize client if coordinates don't match
  world.playerService.broadcastPlayerPositions(session.player.mapId, null);
  return;
}

// If valid, either start or stop based on presence of 'd' field
if (Number.isInteger(packet.d)) {
  world.playerService.startMoving(session.player, packet.d);
} else {
  world.playerService.stopMoving(session.player);
}
```

## Coordinate Validation

The server uses a tolerance-based validation system:

- **Tolerance**: 2 tiles (normal lag)
- **Severe desync threshold**: 5 tiles (forced correction)

If client coordinates are:
- Within 2 tiles: ACCEPTED
- 3-5 tiles away: ACCEPTED with warning
- More than 5 tiles: REJECTED, client receives correction in `pl` packet format

## Server Response to Stop

When a player stops (via 'h' packet without direction):

1. Server calls `stopMoving(player, sendToSelf)`
2. Server broadcasts positions to all visible players in `pl` (player list) format
3. All players in the chunk receive updated positions including:
   - The stopped player with `dx=x, dy=y` (stationary)
   - All other visible players with their current states

### Packet Format

The server ALWAYS sends position updates in the consistent `pkg > pl > p` format:

```json
{
  "type": "pkg",
  "data": "[{\"type\":\"pl\",\"data\":[\"{\\\"type\\\":\\\"p\\\",\\\"id\\\":1001,\\\"x\\\":17,\\\"y\\\":23,\\\"dx\\\":17,\\\"dy\\\":23,...}\"]}]"
}
```

Key points:
- **pkg**: Package wrapper
- **pl**: Player list containing multiple player snapshots
- **p**: Individual player snapshot with position and state

When stopped, the player snapshot has:
- `x, y`: Current position
- `dx, dy`: Destination (equals x, y when not moving)
- `moving`: false (not exposed in packet, but internal state)

## Benefits of This Approach

1. **Consistency**: All position updates use the same packet format
2. **Validation**: Server validates all coordinate claims by client
3. **Synchronization**: All visible players receive updates together
4. **Self-awareness**: Each player receives their own position in the update
5. **Security**: Server maintains authority over positions

## Implementation Notes

### Client Implementation

The client should:

1. Send 'h' packet with coordinates when starting movement:
   ```javascript
   { type: 'h', x: currentX, y: currentY, d: direction }
   ```

2. Send 'h' packet with coordinates when stopping movement:
   ```javascript
   { type: 'h', x: currentX, y: currentY }
   ```

3. Always include current coordinates in the packet for validation

### Server Processing

The server:

1. Validates coordinates against server-side position
2. Accepts if within tolerance (2 tiles)
3. Rejects and sends correction if too far (>5 tiles)
4. Broadcasts positions to all visible players in consistent `pl` format
5. Ensures receiver always gets their own position in the update

## Testing

See `test-pl-packet-consistency.js` for validation that:
- All position updates use `pl` format
- Receivers always get their own position
- Format is consistent across all scenarios
