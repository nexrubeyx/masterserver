# Attack System Implementation

## Overview

This document describes the attack system implementation for the ML Compatible Server. The system allows players to perform attack actions with visual effects that are broadcast to all players in the same map.

## Protocol

### Client Messages

#### Attack Hold (Type: "A")
Sent by the client when the player holds the attack button.

```json
{"type":"A"}
```

**Server Response:**
- Marks the player as attacking (`player.attacking = true`)
- Creates and broadcasts an attack effect to all players in the map

**Effect Packet Format:**
```json
{
  "type": "pkg",
  "data": "[{\"type\":\"fx\",\"tpl\":\"swing\",\"x\":47,\"y\":3,\"s\":\"swish\",\"d\":2}]"
}
```

Where:
- `type: "fx"` - Effect type
- `tpl: "swing"` - Effect template (swing animation)
- `x, y` - Player coordinates where effect is displayed
- `s: "swish"` - Sound effect name
- `d: 2` - Duration in seconds

#### Attack Release (Type: "a")
Sent by the client when the player releases the attack button.

```json
{"type":"a"}
```

**Server Response:**
- Marks the player as not attacking (`player.attacking = false`)

## Implementation Details

### Schema Validation

Both message types are validated using JSON Schema in `src/protocol/schema.js`:

```javascript
// Attack hold
A: {
  type: 'object',
  required: ['type'],
  properties: {
    type: { const: 'A' }
  },
  additionalProperties: false
}

// Attack release
a: {
  type: 'object',
  required: ['type'],
  properties: {
    type: { const: 'a' }
  },
  additionalProperties: false
}
```

### Message Routing

The attack messages are handled in `src/controllers/messageRouter.js`:

```javascript
// Attack Hold Handler
case 'A': {
  const session = world.getSession(ws);
  if (!session) return;
  
  const player = session.player;
  player.attacking = true;
  
  const attackEffect = {
    type: 'fx',
    tpl: 'swing',
    x: player.x,
    y: player.y,
    s: 'swish',
    d: 2
  };
  
  const pkgData = [JSON.stringify(attackEffect)];
  const attackPacket = {
    type: 'pkg',
    data: JSON.stringify(pkgData)
  };
  
  world.sendToAllInMap(player, attackPacket);
  return;
}

// Attack Release Handler
case 'a': {
  const session = world.getSession(ws);
  if (!session) return;
  
  const player = session.player;
  player.attacking = false;
  return;
}
```

## Player State

The attack system adds a new state field to the player object:

- `player.attacking` (boolean) - Indicates whether the player is currently attacking

## Broadcasting

Attack effects are broadcast to all players in the same map using `world.sendToAllInMap()`. This ensures that:
- The attacking player sees their own attack effect
- Other players in the same map see the attack effect
- Players in different maps don't receive the effect

## Client Integration

The client should:
1. Send `{"type":"A"}` when the attack button is pressed/held
2. Receive and render the `fx` effect packet (swing animation with swish sound)
3. Send `{"type":"a"}` when the attack button is released

## Testing

Two test files are provided:

### test-attack-system.js
Basic schema validation test:
```bash
node test-attack-system.js
```

### test-attack-flow.js
Complete flow demonstration:
```bash
node test-attack-flow.js
```

## Future Enhancements

Possible improvements for the attack system:
- Combat calculations (damage, hit detection)
- Attack cooldowns
- Different attack types/animations
- Weapon-specific effects
- Attack range validation
- PvP/PvE damage systems
