# Tile Validation and Speed Modifier System

## Overview

This document describes the tile validation and speed modifier system implemented for the masterserver. This system allows you to:

1. **Define non-walkable tiles** - Tiles that players cannot walk on
2. **Apply speed modifiers** - Tiles that make players move faster (buffs) or slower (debuffs)

## Features

### 1. Tile Walkability System

The walkability system allows you to define which tiles players can or cannot walk on.

#### How it works

- Tiles are checked during movement validation in `playerService.js`
- Non-walkable tiles block movement completely
- Players attempting to move onto non-walkable tiles will stop moving

#### Configuration

Edit `/src/constants/tiles.js` to add non-walkable tiles:

```javascript
export const NON_WALKABLE_TILES = new Set([
  209,  // Cave wall
  // Add more non-walkable tile IDs here
]);
```

#### API

```javascript
import { isWalkable, NON_WALKABLE_TILES } from './src/constants/tiles.js';

// Check if a tile is walkable
if (isWalkable(tileId)) {
  // Player can walk on this tile
}

// Add a non-walkable tile at runtime
NON_WALKABLE_TILES.add(newTileId);
```

### 2. Tile Speed Modifier System

The speed modifier system allows you to make players move faster or slower on specific tiles.

#### How it works

- Speed modifiers are applied when a player enters a tile
- The player's base speed is stored separately from their current speed
- Modified speed affects how long it takes to move to the next tile
- Speed modifiers use a **multiplier** system:
  - `1.0` = normal speed (no change)
  - `<1.0` = slower movement (debuff) - takes MORE time per tile
  - `>1.0` = faster movement (buff) - takes LESS time per tile

#### Speed Calculation

The system uses the formula: `modifiedSpeed = baseSpeed / multiplier`

Examples:
- Base speed: 750ms per tile
- Multiplier 0.5 (slow): `750 / 0.5 = 1500ms` (takes 2x time)
- Multiplier 1.5 (fast): `750 / 1.5 = 500ms` (takes 0.67x time)
- Multiplier 2.0 (very fast): `750 / 2.0 = 375ms` (takes 0.5x time)

#### Configuration

Edit `/src/constants/tiles.js` to add speed modifiers:

```javascript
export const TILE_SPEED_MODIFIERS = new Map([
  [22, 0.5],   // Swamp/mud - 50% speed (2x slower)
  [23, 1.5],   // Road - 150% speed (1.5x faster)
  [24, 2.0],   // Ice - 200% speed (2x faster)
  // Add more tile speed modifiers here
]);
```

#### API

```javascript
import { 
  getTileSpeedModifier, 
  getModifiedSpeed,
  TILE_SPEED_MODIFIERS 
} from './src/constants/tiles.js';

// Get speed multiplier for a tile
const multiplier = getTileSpeedModifier(tileId);
// Returns 1.0 for tiles without modifiers

// Calculate modified speed
const baseSpeed = 750; // ms per tile
const modifiedSpeed = getModifiedSpeed(baseSpeed, tileId);

// Add a speed modifier at runtime
TILE_SPEED_MODIFIERS.set(newTileId, 1.5); // 150% speed
```

## Examples

### Example 1: Creating a Mud Swamp Area

To create mud tiles that slow players down to 50% speed:

```javascript
// In /src/constants/tiles.js
export const TILE_SPEED_MODIFIERS = new Map([
  [100, 0.5],  // Mud tile - 50% speed (takes 2x time)
]);
```

Now when players walk on tile 100, they will move at half speed (take twice as long per tile).

### Example 2: Creating a Fast Road

To create road tiles that speed players up to 150%:

```javascript
// In /src/constants/tiles.js
export const TILE_SPEED_MODIFIERS = new Map([
  [101, 1.5],  // Road tile - 150% speed (takes 0.67x time)
]);
```

### Example 3: Blocking Mountain Tiles

To prevent players from walking on mountain tiles:

```javascript
// In /src/constants/tiles.js
export const NON_WALKABLE_TILES = new Set([
  200,  // Mountain tile
  201,  // Mountain peak
]);
```

### Example 4: Complete Area Setup

Create a complete area with multiple tile types:

```javascript
// In /src/constants/tiles.js

// Non-walkable tiles
export const NON_WALKABLE_TILES = new Set([
  200,  // Mountain
  201,  // Cliff
  202,  // Lava
]);

// Speed modifiers
export const TILE_SPEED_MODIFIERS = new Map([
  // Slow tiles
  [100, 0.5],   // Mud - 50% speed
  [101, 0.7],   // Sand - 70% speed
  [102, 0.8],   // Snow - 80% speed
  
  // Fast tiles
  [110, 1.3],   // Path - 130% speed
  [111, 1.5],   // Road - 150% speed
  [112, 2.0],   // Ice - 200% speed
]);
```

## Integration with Player System

The tile system is fully integrated with the player movement system:

1. **Movement Validation** - Before a player moves, the target tile is checked:
   - Is it within map bounds?
   - Is it deep water (and does player have `canSwim`)?
   - Is it a non-walkable tile?

2. **Speed Application** - After a player moves to a new tile:
   - The current tile's speed modifier is retrieved
   - Player's speed is updated based on the modifier
   - The modified speed affects the next movement step

3. **Speed Persistence** - The system maintains:
   - `player.baseSpeed` - The player's original speed (never changes)
   - `player.speed` - The current modified speed (changes based on tile)

## Technical Details

### Files Modified

1. `/src/constants/tiles.js` - Added tile system constants and functions
2. `/src/services/playerService.js` - Integrated tile validation and speed modifiers

### Key Functions

#### In `tiles.js`:

- `isWalkable(tileId)` - Check if tile can be walked on
- `getTileSpeedModifier(tileId)` - Get speed multiplier for tile
- `getModifiedSpeed(baseSpeed, tileId)` - Calculate modified speed

#### In `playerService.js`:

- Modified `tickPlayer()` to check walkability and apply speed modifiers
- Stores `player.baseSpeed` for reference
- Updates `player.speed` based on current tile

### Performance Considerations

- **Set Lookup**: `NON_WALKABLE_TILES` uses a `Set` for O(1) lookup performance
- **Map Lookup**: `TILE_SPEED_MODIFIERS` uses a `Map` for O(1) lookup performance
- **Memory**: Both structures are memory-efficient and scale well with many tiles
- **CPU**: Tile checks are performed only during movement, minimal overhead

## Testing

Run the test suite to verify the system:

```bash
node test-tile-system.js
```

The test suite validates:
- Tile walkability checks
- Speed modifier calculations
- Integration with existing deep water system
- Edge cases and error handling

## Future Enhancements

Possible future improvements:

1. **Per-Player Abilities** - Allow certain players to walk on specific tiles
   - Example: `player.canClimb` to walk on mountain tiles
   - Example: `player.canSwim` to walk on water tiles (already implemented)

2. **Tile Effects** - Add additional effects beyond speed
   - Damage over time (lava tiles)
   - Healing over time (healing spring tiles)
   - Status effects (poison, slow, haste)

3. **Dynamic Tiles** - Change tile properties at runtime
   - Weather effects (rain makes tiles slippery)
   - Day/night cycle (ice melts during day)

4. **Tile Groups** - Define groups of tiles with similar properties
   - All "swamp" tiles have the same speed modifier
   - All "mountain" tiles are non-walkable

## Backward Compatibility

This system is **100% backward compatible**:

- Existing tiles work exactly as before
- Deep water system continues to work
- No changes required to existing maps
- Default behavior (all tiles walkable, no speed modifiers) is preserved

## Support

For questions or issues, please refer to:
- Test file: `test-tile-system.js`
- Implementation: `src/constants/tiles.js`
- Integration: `src/services/playerService.js`
