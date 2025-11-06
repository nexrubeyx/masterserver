# Attack System Implementation

## Overview

This document describes the attack system implementation for the ML Compatible Server. The system allows players to perform attack actions with visual effects that are broadcast to all players in the same map.

**Key Features:**
- Attack effects appear **in front of the player** based on their facing direction
- Attacks **loop continuously** while the attack button is held (type "A")
- Each player has a configurable **attackSpeed** (default: 1000ms / 1 second)
- Attack effects stop immediately when the attack button is released (type "a")

## Protocol

### Client Messages

#### Attack Hold (Type: "A")
Sent by the client when the player holds the attack button.

```json
{"type":"A"}
```

**Server Response:**
- Marks the player as attacking (`player.attacking = true`)
- Creates and broadcasts an attack effect **in front of the player** to all players in the map
- Starts an attack loop that repeats every `player.attackSpeed` milliseconds
- The loop continues until the attack button is released

**Effect Packet Format:**
```json
{
  "type": "pkg",
  "data": "[{\"type\":\"fx\",\"tpl\":\"swing\",\"x\":48,\"y\":3,\"s\":\"swish\",\"d\":2}]"
}
```

Where:
- `type: "fx"` - Effect type
- `tpl: "swing"` - Effect template (swing animation)
- `x, y` - Coordinates **in front of the player** (calculated based on player direction)
- `s: "swish"` - Sound effect name
- `d: 2` - Duration in seconds

**Attack Position Calculation:**
The attack effect position is calculated based on the player's facing direction.
Note: The Monster Legend client uses Cartesian coordinates where Y increases upward (towards top of screen).

- Direction 0 (UP): effect at (player.x, player.y + 1)
- Direction 1 (RIGHT): effect at (player.x + 1, player.y)
- Direction 2 (DOWN): effect at (player.x, player.y - 1)
- Direction 3 (LEFT): effect at (player.x - 1, player.y)

#### Attack Release (Type: "a")
Sent by the client when the player releases the attack button.

```json
{"type":"a"}
```

**Server Response:**
- Marks the player as not attacking (`player.attacking = false`)
- Stops the attack loop immediately
- Clears the attack interval timer

## Implementation Details

## Player Configuration

### Attack Speed

Each player has an `attackSpeed` property that controls how often attacks are triggered while the attack button is held.

**Default Value:** 1000ms (1 second)

**Configuration:**
- Stored in the Player document in MongoDB
- Can be customized per player for different attack speeds
- Loaded when player logs in
- Defaults to 1000ms for existing players without this field

**Examples:**
- `attackSpeed: 500` - Fast attack (2 attacks per second)
- `attackSpeed: 1000` - Normal attack (1 attack per second) **[DEFAULT]**
- `attackSpeed: 2000` - Slow attack (0.5 attacks per second)

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
  
  // Prevent multiple attack intervals
  if (player.attacking) return;
  
  player.attacking = true;
  
  // Helper function to send attack effect
  const sendAttackEffect = () => {
    // Calculate position in front of player based on direction
    // Note: Using Cartesian coordinates (Y increases upward)
    const { dx, dy } = getDirectionOffset(player.dir);
    const attackX = player.x + dx;
    const attackY = player.y + dy;
    
    const attackEffect = {
      type: 'fx',
      tpl: 'swing',
      x: attackX,  // Position in front
      y: attackY,  // Position in front
      s: 'swish',
      d: 2
    };
    
    const pkgData = [JSON.stringify(attackEffect)];
    const attackPacket = {
      type: 'pkg',
      data: JSON.stringify(pkgData)
    };
    
    world.sendToAllInMap(player, attackPacket);
  };
  
  // Send first attack immediately
  sendAttackEffect();
  
  // Start attack loop
  const attackSpeed = player.attackSpeed || 1000;
  player._attackInterval = setInterval(() => {
    if (!player.attacking) {
      clearInterval(player._attackInterval);
      player._attackInterval = null;
      return;
    }
    sendAttackEffect();
  }, attackSpeed);
  
  return;
}

// Attack Release Handler
case 'a': {
  const session = world.getSession(ws);
  if (!session) return;
  
  const player = session.player;
  player.attacking = false;
  
  // Clear attack interval
  if (player._attackInterval) {
    clearInterval(player._attackInterval);
    player._attackInterval = null;
  }
  
  return;
}
```

## Player State

The attack system adds new state fields to the player object:

- `player.attacking` (boolean) - Indicates whether the player is currently attacking
- `player.attackSpeed` (number) - Time in milliseconds between attacks (default: 1000)
- `player._attackInterval` (private) - Timer reference for the attack loop

## Memory Management

The attack system properly cleans up intervals to prevent memory leaks:

1. **On Attack Release (type "a"):** Clears the interval immediately
2. **On Player Disconnect:** Clears any active attack interval in `handleDisconnect()`
3. **On Server Shutdown:** Clears all attack intervals before closing connections

## Broadcasting

Attack effects are broadcast to all players in the same map using `world.sendToAllInMap()`. This ensures that:
- The attacking player sees their own attack effect
- Other players in the same map see the attack effect at the correct position (in front of the attacker)
- Players in different maps don't receive the effect
- Effects are sent repeatedly at the configured `attackSpeed` interval

## Client Integration

The client should:
1. Send `{"type":"A"}` when the attack button is pressed/held
2. Receive and render the `fx` effect packets (swing animation with swish sound) **in front of the character**
3. Continue receiving attack effects every `attackSpeed` milliseconds while the button is held
4. Send `{"type":"a"}` when the attack button is released to stop the attack loop

**Important:** The client does NOT need to continuously send "A" messages. Sending it once starts the server-side loop, which continues until "a" is received.

## Testing

Two test files are provided:

### test-attack-speed.js
Comprehensive test suite that validates:
- Attack position calculation for all 4 directions
- Attack speed configuration with different values
- Attack loop timing and cleanup
- Default attackSpeed fallback behavior

Run with:
```bash
node test-attack-speed.js
```

### test-attack-system.js (legacy)
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
- Attack cooldowns independent of attackSpeed
- Different attack types/animations
- Weapon-specific effects and speeds
- Attack range validation (multi-tile reach)
- PvP/PvE damage systems
- Items/buffs that modify attackSpeed
- Critical hits with different animations

## Database Schema

The Player document in MongoDB includes:

```javascript
{
  // ... other fields ...
  speed: 350,           // Movement speed in ms/tile
  attackSpeed: 1000,    // Attack speed in ms (NEW)
  // ... other fields ...
}
```

**Backwards Compatibility:** Existing players without the `attackSpeed` field will automatically use the default value of 1000ms when they log in.
