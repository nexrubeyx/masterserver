# Example: Tile System Configuration

This file provides practical examples of how to configure the tile validation and speed modifier system.

## Scenario: Fantasy RPG World

Let's configure a complete fantasy world with different terrain types:

### Configuration in `src/constants/tiles.js`

```javascript
// === NON-WALKABLE TILES ===
// Tiles that completely block movement
export const NON_WALKABLE_TILES = new Set([
  // Mountains and cliffs
  200,  // Mountain peak
  201,  // Mountain side
  202,  // Cliff face
  203,  // Steep cliff
  
  // Structures
  209,  // Cave wall (already in set)
  210,  // Stone wall
  211,  // Wooden wall
  212,  // Metal gate (closed)
  
  // Dangerous terrain
  220,  // Lava
  221,  // Deep crevasse
  222,  // Spike pit
]);

// === SPEED MODIFIERS ===
// Format: [tileId, speedMultiplier]
// speedMultiplier: 1.0 = normal, <1.0 = slower, >1.0 = faster
export const TILE_SPEED_MODIFIERS = new Map([
  // === SLOW TERRAIN (Debuffs) ===
  // These tiles make movement slower
  
  // Very slow (50% speed = takes 2x time)
  [100, 0.5],   // Deep mud
  [101, 0.5],   // Thick swamp
  [102, 0.5],   // Heavy snow
  
  // Moderately slow (70% speed = takes ~1.4x time)
  [103, 0.7],   // Light mud
  [104, 0.7],   // Sand
  [105, 0.7],   // Shallow water
  [106, 0.7],   // Grass (tall)
  
  // Slightly slow (80% speed = takes 1.25x time)
  [107, 0.8],   // Rocky ground
  [108, 0.8],   // Rubble
  [109, 0.8],   // Forest floor
  
  // === FAST TERRAIN (Buffs) ===
  // These tiles make movement faster
  
  // Slightly fast (120% speed = takes ~0.83x time)
  [150, 1.2],   // Dirt path
  [151, 1.2],   // Gravel path
  
  // Moderately fast (150% speed = takes ~0.67x time)
  [152, 1.5],   // Cobblestone road
  [153, 1.5],   // Wooden bridge
  
  // Very fast (200% speed = takes 0.5x time)
  [154, 2.0],   // Stone road
  [155, 2.0],   // Paved highway
  [156, 2.0],   // Ice (slippery but fast)
  
  // Ultra fast (250% speed = takes 0.4x time)
  [157, 2.5],   // Magic portal floor
  [158, 2.5],   // Speed rune tile
]);
```

## Visual Guide

Here's how different tiles affect movement with base speed of 750ms:

### Slow Tiles (Debuffs)

| Tile ID | Type | Multiplier | Time per tile | Effect |
|---------|------|------------|---------------|--------|
| 100-102 | Deep mud/swamp/snow | 0.5 | 1500ms | Very slow |
| 103-106 | Light mud/sand/water | 0.7 | 1071ms | Moderately slow |
| 107-109 | Rocky/rubble/forest | 0.8 | 937ms | Slightly slow |

### Fast Tiles (Buffs)

| Tile ID | Type | Multiplier | Time per tile | Effect |
|---------|------|------------|---------------|--------|
| 150-151 | Dirt/gravel path | 1.2 | 625ms | Slightly fast |
| 152-153 | Cobblestone/bridge | 1.5 | 500ms | Moderately fast |
| 154-156 | Stone road/ice | 2.0 | 375ms | Very fast |
| 157-158 | Magic/speed rune | 2.5 | 300ms | Ultra fast |

## Map Design Examples

### Example 1: Swamp Area

```json
{
  "id": "swamp",
  "version": 1,
  "width": 20,
  "height": 20,
  "tiles": "100:100:100:101:101:..."
}
```

Players entering this swamp will move at 50% speed (twice as slow).

### Example 2: Town with Roads

```json
{
  "id": "town",
  "version": 1,
  "width": 50,
  "height": 50,
  "tiles": [
    [21, 21, 152, 152, 152, 21, 21],  // Cobblestone road through grass
    [21, 21, 152, 152, 152, 21, 21],
    ...
  ]
}
```

Players walking on the road (tile 152) move 50% faster than on grass.

### Example 3: Mountain Pass

```json
{
  "id": "mountain",
  "version": 1,
  "width": 30,
  "height": 30,
  "tiles": [
    [200, 200, 200, 107, 107, 107],  // Mountains block, rocky path is slow
    [200, 200, 107, 107, 21, 21],
    [200, 107, 107, 21, 21, 21],
    ...
  ]
}
```

- Tile 200 (mountain): Blocks movement completely
- Tile 107 (rocky ground): Allows passage but at 80% speed
- Tile 21 (grass): Normal movement

## Testing Your Configuration

After configuring tiles, test with:

```bash
node test-tile-system.js
```

## In-Game Effects

### Player Experience

**Walking on swamp (tile 100):**
- Base speed: 750ms per tile
- Modified speed: 1500ms per tile
- Player experiences: Slow, labored movement

**Walking on stone road (tile 154):**
- Base speed: 750ms per tile
- Modified speed: 375ms per tile
- Player experiences: Fast, smooth movement

**Attempting to walk on mountain (tile 200):**
- Movement blocked completely
- Player stops at edge of mountain tile

## Advanced Examples

### Dynamic Speed Zones

Create areas with progressive speed changes:

```javascript
// Gradually increasing speed as you approach town
[21, 1.0],    // Normal grass
[150, 1.2],   // Dirt path
[151, 1.2],   // Gravel path
[152, 1.5],   // Cobblestone
[154, 2.0],   // Stone road in town center
```

### Obstacle Courses

Create challenging areas mixing speed and obstacles:

```javascript
// Speed boost zones
[156, 2.0],   // Ice (fast but maybe dangerous)
[100, 0.5],   // Mud trap (slow)

// Walls to navigate around
NON_WALKABLE_TILES.add(210);  // Stone wall
```

### Themed Areas

**Desert:**
```javascript
[104, 0.7],   // Sand (slow)
[222, -],     // Spike pit (blocked in NON_WALKABLE_TILES)
```

**Ice Castle:**
```javascript
[156, 2.0],   // Ice floor (fast)
[102, 0.5],   // Snow (slow)
```

**Forest:**
```javascript
[109, 0.8],   // Forest floor (slightly slow)
[200, -],     // Dense trees (blocked in NON_WALKABLE_TILES)
```

## Performance Tips

1. **Use tile ranges efficiently**: Group similar tiles together
2. **Don't overuse modifiers**: Too many different speeds can be disorienting
3. **Test balance**: Make sure speed differences are noticeable but not frustrating
4. **Consider gameplay**: Roads should be significantly faster to encourage use

## Common Patterns

### Roads System
```javascript
[150, 1.2],   // Dirt path (tier 1)
[152, 1.5],   // Cobblestone (tier 2)
[154, 2.0],   // Stone road (tier 3)
```

### Hazard System
```javascript
[100, 0.5],   // Slow hazard (mud)
[220, -],     // Deadly hazard (lava - blocked)
```

### Terrain System
```javascript
[21, 1.0],    // Grass (normal)
[107, 0.8],   // Rocky (slow)
[104, 0.7],   // Sand (slower)
[100, 0.5],   // Swamp (slowest)
```

## Troubleshooting

**Players moving too slow everywhere:**
- Check if you accidentally made common tiles (like grass) slow
- Default tiles should have 1.0 multiplier (no entry in TILE_SPEED_MODIFIERS)

**Players not blocked by walls:**
- Verify tile IDs are correct in NON_WALKABLE_TILES
- Check that the map is using the correct tile IDs

**Speed changes not noticeable:**
- Increase the difference between slow and fast tiles
- Use at least 0.5 for slow and 1.5 for fast to be noticeable

## Reference

See `TILE_VALIDATION_SPEED_SYSTEM.md` for:
- Complete API documentation
- Technical implementation details
- Integration information
