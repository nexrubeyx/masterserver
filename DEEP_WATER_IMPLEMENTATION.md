# Deep Water Implementation - Perfect Client Parity

This document describes the implementation of deep water tiles with perfect parity to the game client's rendering and animation behavior.

## Overview

The server now supports three types of water tiles that match the client's classification system:

1. **Shallow Water** (tiles 36, 21) - Category 1 in client's edge blending
2. **Deep Water Static** (tiles 215, 248) - Category 2 in client's edge blending  
3. **Deep Water Animated** (tile 325) - Triggers animation overlay in client

## Implementation Details

### 1. Tile Constants (`src/constants/tiles.js`)

New module defining water tile IDs and helper functions:

```javascript
// Tile IDs
SHALLOW_WATER_1 = 36
SHALLOW_WATER_2 = 21
DEEP_WATER_STATIC_1 = 215
DEEP_WATER_STATIC_2 = 248
DEEP_WATER_ANIMATED = 325

// Helper Functions
isShallowWater(tileId) -> boolean
isDeepWater(tileId) -> boolean  // Returns true for static AND animated
isWater(tileId) -> boolean      // Returns true for any water type
```

### 2. Movement/Collision System (`src/services/playerService.js`)

Deep water tiles (215, 248, 325) now block player movement by default:

```javascript
// In tickPlayer movement loop:
const tileAtTarget = map.tiles[ny]?.[nx];
if (Number.isFinite(tileAtTarget) && isDeepWater(tileAtTarget)) {
  const canSwim = player.canSwim || false;
  if (!canSwim) {
    break; // Movement blocked
  }
}
```

**Future Enhancement**: The `player.canSwim` flag can be set to `true` to allow swimming in deep water (e.g., via skills, items, or permissions).

### 3. Test Map (`src/maps/worlds/test2.json`)

Updated test2 map (ID: "caverealm") with a demonstrative lake centered in the 15x15 map:

**Lake Structure** (from outer to inner):
- **Outer ring** (1 tile thick): Shallow water (36) for outer edge blending with ground
- **Middle ring** (1 tile thick): Deep water static (248) for edge blending between shallow and deep
- **Core area**: Deep water animated (325) for animation overlay

**Visualization**:
```
Row  2 :   .  #  #  #  # 36 36 36 36 36  #  #  #  #  .
Row  3 :   .  #  #  # 36 36248248248 36 36  #  #  #  .
Row  4 :   .  #  # 36 36248248325248248 36 36  #  #  .
Row  5 :   .  # 36 36248248325325325248248 36 36  #  .
Row  6 :   .  # 36248248325325325325325248248 36  #  .
Row  7 :   .  # 36248325325325325325325325248 36  #  .
Row  8 :   .  # 36248248325325325325325248248 36  #  .
Row  9 :   .  # 36 36248248325325325248248 36 36  #  .
Row 10 :   .  #  # 36 36248248325248248 36 36  #  #  .
```

Legend:
- `.` = void (tile 0)
- `#` = ground (tile 22)
- `36` = shallow water
- `248` = deep water static
- `325` = deep water animated

### 4. Tile ID Preservation

The server's map pipeline (`src/services/mapService.js`) already preserves exact tile IDs:

```javascript
// In normalizeMapData:
json.tiles[y][x] = Number.isFinite(v) ? v : 0;
```

Tile IDs are never remapped, ensuring the client receives the exact values it expects for:
- Edge blending classification (categories 1, 2, 3)
- Animation triggering (tile 325)

## Client-Side Behavior

Based on the client code (ml.min.js):

### Edge Blending
The client's `get_edge` and `tile_sprite` functions classify tiles:
- Tiles 36 or 21 → category 1 (shallow water)
- Tiles 215 or 248 → category 2 (deep water static)
- Tile 218 → category 3 (other, e.g., lava)

Adjacent tiles of different categories create blended edge sprites.

### Animation
The client's `update_map` function checks:
```javascript
if (tile == 325) {
  map[s].anim.visible = 1;
}
```

A global timer toggles visibility for animated overlay effect.

**Important**: Tile 325 is NOT categorized in `tile_sprite`, so using only 325 does not create blended edges. The static deep water ring (248) is required for proper edge transitions.

## Testing

### Unit Tests (Manual Verification)

Test helper functions:
```javascript
import { isShallowWater, isDeepWater, isWater } from './src/constants/tiles.js';

// Shallow water
assert(isShallowWater(36) === true);
assert(isShallowWater(21) === true);
assert(isShallowWater(248) === false);

// Deep water
assert(isDeepWater(215) === true);
assert(isDeepWater(248) === true);
assert(isDeepWater(325) === true);
assert(isDeepWater(36) === false);

// Any water
assert(isWater(36) === true);
assert(isWater(248) === true);
assert(isWater(325) === true);
assert(isWater(22) === false);
```

Test movement collision:
```javascript
const player = { canSwim: false };
// Shallow water: walkable
// Deep water (248, 325): blocked

const playerWithSwim = { canSwim: true };
// All water: walkable
```

### Visual Verification

1. Start the server and connect a client
2. Load the "caverealm" (test2) map
3. Observe:
   - **Outer edges**: Shallow water (36) blends with ground (22) using category 1 sprites
   - **Middle ring**: Deep static (248) blends with shallow using category 2 sprites
   - **Core area**: Animated overlay toggles on tile 325
4. Try to walk into the lake:
   - Shallow water (36): Player can walk through
   - Deep water (248, 325): Player is blocked at the edge

## Configuration

No additional configuration is needed. The implementation uses:
- Existing map loading system
- Existing movement validation system
- No changes to network protocol (tile IDs sent as-is)

## Future Enhancements

1. **Swim Skill**: Set `player.canSwim = true` to allow movement in deep water
2. **Swim Animation**: Add client-side animation when player is in deep water
3. **Other Water Types**: Support lava (tile 218, category 3) with same pattern
4. **Water Damage**: Apply damage when player enters deep water without swim ability

## Compatibility

- **Breaking Changes**: None. Shallow water (36) remains walkable as before.
- **Other Maps**: Unaffected. Only test2 has the example lake.
- **Client Compatibility**: 100% - uses exact tile IDs expected by client's ml.min.js

## Version

Map version incremented to 2 for test2.json to ensure MongoDB updates.
