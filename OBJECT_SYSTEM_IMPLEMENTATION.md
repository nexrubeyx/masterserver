# World Object System Implementation

## Overview

This document describes the implementation of a complete server-side world object system compatible with the ML client protocol (ml.min.js). The system allows players to interact with objects placed on the map, such as stone, wood, and bushes.

## Architecture

### Components

1. **Object Templates** (`src/constants/objectTemplates.js`)
   - Defines static object definitions
   - Contains stone, wood, and bush templates
   - Each template specifies visual and behavioral properties

2. **ObjectService** (`src/services/objectService.js`)
   - Manages object state per map
   - Handles object placement and removal
   - Processes pickup interactions
   - Broadcasts state changes to clients

3. **Protocol Schema** (`src/protocol/schema.js`)
   - Validates pickup messages from clients
   - Ensures type safety for object interactions

4. **Message Router** (`src/controllers/messageRouter.js`)
   - Routes pickup messages to ObjectService
   - Sends templates and objects on player login

5. **World Integration** (`src/state/world.js`)
   - Initializes ObjectService during world startup
   - Provides reference for services to communicate

6. **PlayerService Integration** (`src/services/playerService.js`)
   - Checks for blocking objects during movement
   - Prevents walking through solid objects

## Data Structures

### Object Template Format

```javascript
{
  tpl: 'stone',                                    // Unique template key
  name: 'Stone',                                   // Display name
  desc: 'A solid piece of stone, useful for...',   // Description
  stack: 1,                                        // Can stack in inventory
  pickup: 1,                                       // Can be picked up
  block: 1,                                        // Blocks player movement
  spr: 10,                                         // Sprite index (+ items, - tiles)
  build: ''                                        // Build string (for composed sprites)
}
```

### Object State Storage

Objects are stored per map using a nested Map structure:

```javascript
Map<mapId, Map<"x,y", Array<{tpl: string, count: number}>>>
```

Example:
```javascript
objectsByMap.set('caverealm2', new Map([
  ['3,3', [{ tpl: 'stone', count: 2 }]],
  ['5,3', [{ tpl: 'wood', count: 3 }]],
  ['7,3', [{ tpl: 'bush', count: 1 }]]
]))
```

This structure allows:
- O(1) lookup by position
- Multiple object types per tile (stacking)
- Efficient count tracking

## Protocol Messages

### 1. obj_tpl (Object Template Definition)

**Direction**: Server → Client  
**When**: On player login, when templates change  
**Purpose**: Defines how object should render and behave

```javascript
{
  type: 'obj_tpl',
  tpl: 'stone',
  name: 'Stone',
  desc: 'A solid piece of stone, useful for building.',
  stack: 1,
  pickup: 1,
  block: 1,
  spr: 10,
  build: ''
}
```

### 2. o (Object Placement)

**Direction**: Server → Client  
**When**: On player login, viewport change  
**Purpose**: Places object instance on map

```javascript
{
  type: 'o',
  x: 3,
  y: 3,
  d: 'stone',  // Template key
  c: 2         // Count (optional)
}
```

### 3. obj (Object State Update)

**Direction**: Server → Client  
**When**: Object count changes (pickup, etc)  
**Purpose**: Updates object state for all players

```javascript
{
  type: 'obj',
  x: 3,
  y: 3,
  d: 'stone',
  c: 1  // New count (0 = removed)
}
```

### 4. pickup (Pickup Request)

**Direction**: Client → Server  
**When**: Player interacts with object  
**Purpose**: Request to pick up object

```javascript
{
  type: 'pickup',
  x: 3,
  y: 3,
  tpl: 'stone'
}
```

## Initialization Flow

### Server Startup

1. **World.init()**
   - Calls `mapService.loadAll()` to load maps
   - Calls `objectService.init()` to initialize objects
   - Calls `startGameLoop()` to begin game tick

2. **ObjectService.init()**
   - Creates object state map for each loaded map
   - Calls `spawnInitialObjects()` for each map
   - Logs initialization status

3. **spawnInitialObjects(mapId)**
   - Reads `objectPlacements` array from map JSON
   - Validates each template exists
   - Calls `placeObject()` for each placement

### Player Login Flow

When a player logs in successfully:

1. Server sends `accepted` packet with session info
2. Server sends player template (`plr_tpl`)
3. Server sends player snapshot (`p`)
4. Server sends map transition (`mt`)
5. Server sends viewport tiles
6. **NEW**: Server sends all object templates (`obj_tpl`)
7. **NEW**: Server sends visible objects in viewport (`o`)
8. Server sends inventory (`inv`)
9. Server sends music command
10. Server synchronizes with other players

## Interaction Flow

### Pickup Interaction

```
Client                    Server
  |                         |
  |------- pickup --------->|
  |                         |
  |                    Validate:
  |                    - Template exists
  |                    - Template pickupable
  |                    - Distance <= 1
  |                    - Object exists
  |                         |
  |                    Remove object
  |                    from world state
  |                         |
  |<------- obj ------------|  (broadcast to all in map)
  |                         |
```

Validation rules:
- Template must exist in OBJECT_TEMPLATES
- Template must have pickup=1
- Player must be adjacent (dx<=1, dy<=1)
- Object must exist at specified position

### Movement with Object Collision

```
Client                    Server
  |                         |
  |--------- h ------------>|  (movement command)
  |                         |
  |                    Validate:
  |                    - In map bounds
  |                    - Not deep water (or has swim)
  |                    - No blocking objects
  |                         |
  |                    Update position
  |                         |
  |<------- p --------------|  (position snapshot)
  |                         |
```

Blocking check in PlayerService:
```javascript
if (this.world.objectService.hasBlockingObject(mapId, x, y)) {
  break;  // Stop movement
}
```

## Map Configuration

Maps can define initial object placements in JSON:

```json
{
  "id": "caverealm2",
  "version": 2,
  "title": "Cave Realm",
  "width": 10,
  "height": 10,
  "tiles": [...],
  "objectPlacements": [
    { "x": 3, "y": 3, "tpl": "stone", "count": 2 },
    { "x": 5, "y": 3, "tpl": "wood", "count": 3 },
    { "x": 7, "y": 3, "tpl": "bush", "count": 1 }
  ]
}
```

When map version is incremented, server:
1. Reloads map from JSON
2. Detects version change
3. Updates MongoDB
4. Respawns objects based on new configuration

## Object Templates

### Stone
- **Sprite**: 10 (items sheet)
- **Blocks**: Yes
- **Pickupable**: Yes
- **Stackable**: Yes
- **Use Case**: Building material, obstacles

### Wood
- **Sprite**: 15 (items sheet)
- **Blocks**: No
- **Pickupable**: Yes
- **Stackable**: Yes
- **Use Case**: Crafting material, decorative

### Bush
- **Sprite**: -74 (tile 74 from tileset)
- **Blocks**: Yes
- **Pickupable**: Yes
- **Stackable**: Yes
- **Use Case**: Natural obstacle, harvesting

## Client Compatibility

The implementation is compatible with ml.min.js client expectations:

1. **obj_tpl packet structure**: Matches client's expected fields
2. **Sprite indexing**: Positive = items sheet, negative = tile index
3. **Build string**: Supports empty string for simple objects
4. **State updates**: Uses 'o' for placement, 'obj' for updates
5. **Count field**: Client expects 'c' field for quantity

Verified through:
- Studying client code patterns
- Testing with existing animated objects
- Following established protocol conventions

## Performance Considerations

### Memory
- Objects stored in JavaScript Map (O(1) lookup)
- Small memory footprint per object (~50 bytes)
- Typical map: 10-50 objects = ~2.5 KB

### Network
- Templates sent once on login (~300 bytes total)
- Objects sent only in viewport (~50 bytes per object)
- Updates broadcast to map players only

### CPU
- Object lookup: O(1) by position key
- Viewport filtering: O(n) where n = total objects
- Broadcast: O(m) where m = players in map
- Collision check: O(k) where k = objects at tile (typically 1-2)

Optimizations:
- Viewport filtering prevents sending all objects
- Position-based indexing avoids array scans
- Count tracking avoids re-parsing stacks

## Testing

### Automated Tests

**test-objects.js**: 14 tests covering:
- Template definitions (existence, properties)
- Protocol format compliance
- Schema validation (pickup messages)
- Map configuration validation

Run: `node test-objects.js`

**test-deep-water.js**: 29 existing tests
- Verifies no regression in existing features

### Manual Testing

See `OBJECT_SYSTEM_TESTING.md` for detailed manual test scenarios:
- Template reception on login
- Object rendering on map
- Pickup interaction
- Movement blocking
- Multi-player synchronization
- Distance validation

## Future Enhancements

### Database Persistence
Currently objects respawn on server restart. Future:
- Save object state to MongoDB
- Restore state on server startup
- Track object ownership/history

### Inventory Integration
Currently pickup removes from world but doesn't add to inventory. Future:
- Implement proper inventory system
- Add/remove items from player inventory array
- Save inventory to database
- Send inventory updates to client

### Dynamic Spawning
Currently objects are static from map config. Future:
- Respawn timers for gathered resources
- Random spawn locations
- Spawn based on game events
- Procedural generation

### Advanced Interactions
Currently only pickup is supported. Future:
- Use/activate objects
- Transform objects (e.g., mine stone → ore)
- Craft objects from materials
- Drop objects from inventory

### Performance Optimization
For larger scale deployments:
- Spatial indexing (quad-tree or grid)
- Object state compression
- Delta updates instead of full state
- Database sharding by map

## API Reference

### ObjectService

#### Methods

**init(): Promise<void>**
- Initializes object service
- Spawns initial objects on all maps
- Called during world startup

**placeObject(mapId, x, y, tpl, count): void**
- Places object(s) at position
- Adds to existing stack if present
- Parameters validated internally

**removeObject(mapId, x, y, tpl, count): number**
- Removes object(s) from position
- Returns actual count removed
- Removes from stack if count reaches 0

**getObjectsAt(mapId, x, y): Array<{tpl, count}>**
- Returns all objects at position
- Empty array if none present
- Does not modify state

**hasBlockingObject(mapId, x, y): boolean**
- Checks if any object blocks movement
- Returns true if any object has block=1
- Used by PlayerService for collision

**sendTemplates(player): void**
- Sends all obj_tpl messages to player
- Called on player login
- Sends one message per template

**sendVisibleObjects(player): void**
- Sends objects in player's viewport
- Called on login and viewport change
- Sends 'o' messages for each object

**handlePickup(player, x, y, tpl): boolean**
- Processes pickup interaction
- Validates distance, template, existence
- Broadcasts update to map players
- Returns true if successful

## Security

### Input Validation

1. **Protocol Schema**: Ajv validates all incoming messages
2. **Distance Check**: Prevents picking up objects from across map
3. **Template Check**: Rejects unknown object types
4. **Existence Check**: Validates object actually exists

### Rate Limiting

Existing WebSocket rate limiting applies to pickup messages:
- 200 messages per 10 seconds
- Connection closed if exceeded
- Prevents pickup spam

### Sanitization

- Coordinates limited to -99999 to 99999
- Template keys limited to 64 characters
- No SQL injection risk (using MongoDB native driver)
- No XSS risk (server doesn't render HTML)

## Troubleshooting

### "Unknown object template in map config"
- Check template key matches exactly (case-sensitive)
- Verify template exists in objectTemplates.js
- Common typo: 'Stone' vs 'stone'

### "ObjectService not initialized"
- Verify World.init() calls objectService.init()
- Check server logs for initialization message
- Confirm no errors during map loading

### Objects not visible to client
- Verify templates sent before objects
- Check viewport bounds include object position
- Confirm map version incremented (forces reload)
- Inspect network tab for obj_tpl and o messages

### Pickup not working
- Check distance (must be <= 1)
- Verify object has pickup=1
- Confirm object exists (not already picked up)
- Check server logs for rejection reason

### Movement not blocked
- Verify object has block=1
- Confirm ObjectService reference in PlayerService
- Check object actually at position
- Review server logs for collision check

## References

- **Client Protocol**: ml.min.js (proprietary)
- **Existing Patterns**: animatedObjects.js, mapObjectsLoader.js
- **Similar Systems**: Player snapshots, chat messages
- **MongoDB Driver**: https://www.mongodb.com/docs/drivers/node/

## Credits

Implementation follows established patterns in the codebase:
- Protocol validation (schema.js)
- Service architecture (PlayerService, MapService)
- Broadcasting (World.broadcastInMap)
- State management (in-memory Maps)

Compatible with ML client expectations based on:
- Reverse engineering client code patterns
- Testing with existing features
- Community documentation
