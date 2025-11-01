# World Object System - Manual Testing Guide

This guide explains how to manually test the world object system implementation with the ML client.

## Prerequisites

1. Server running on localhost:8080 (or configured port)
2. ML client (ml.min.js) loaded in browser
3. MongoDB running and accessible
4. Test map (caverealm2) loaded with object placements

## Test Map Configuration

The test map (src/maps/worlds/test.json) has been configured with the following objects:

| Position | Object | Count | Properties |
|----------|--------|-------|------------|
| (3, 3)   | stone  | 2     | Blocks movement, pickupable |
| (5, 3)   | wood   | 3     | Does NOT block, pickupable |
| (7, 3)   | bush   | 1     | Blocks movement, pickupable |
| (4, 5)   | stone  | 1     | Blocks movement, pickupable |
| (6, 7)   | wood   | 2     | Does NOT block, pickupable |

## Test Scenarios

### 1. Object Templates on Login

**Expected Behavior:**
- When player logs in, client should receive obj_tpl messages for stone, wood, and bush
- Each template should contain: tpl, name, desc, stack, pickup, block, spr, build fields

**How to Test:**
1. Open browser console
2. Log in to the server
3. Watch console for obj_tpl messages
4. Verify all three templates are received

**Expected Console Output:**
```javascript
{type: "obj_tpl", tpl: "stone", name: "Stone", desc: "A solid piece of stone...", ...}
{type: "obj_tpl", tpl: "wood", name: "Wood", desc: "A piece of wood...", ...}
{type: "obj_tpl", tpl: "bush", name: "Bush", desc: "A leafy bush...", ...}
```

### 2. Object Placement Rendering

**Expected Behavior:**
- Objects should render on the map at configured positions
- Stone and bush should show as solid blocking objects
- Wood should be visible but not block movement

**How to Test:**
1. Log in and spawn in caverealm2 map
2. Navigate to positions (3,3), (5,3), (7,3)
3. Verify objects are visible
4. Try walking through wood (should work)
5. Try walking through stone or bush (should be blocked)

**Expected Visual:**
- Stone: Appears as sprite index 10 from items sheet
- Wood: Appears as sprite index 15 from items sheet
- Bush: Appears as tile 74 (negative sprite index)

### 3. Pickup Interaction

**Expected Behavior:**
- Player can pickup objects when adjacent (within 1 tile)
- Pickup reduces object count by 1
- When count reaches 0, object disappears
- All players in map see the update

**How to Test:**
1. Move player adjacent to stone at (3,3)
2. Send pickup message via console:
   ```javascript
   ws.send(JSON.stringify({type: 'pickup', x: 3, y: 3, tpl: 'stone'}))
   ```
3. Verify object count decreases from 2 to 1
4. Pickup again to remove completely
5. Verify object disappears from map

**Expected Network Messages:**
```javascript
// After first pickup (count 2 -> 1)
{type: "obj", x: 3, y: 3, d: "stone", c: 1}

// After second pickup (count 1 -> 0)
{type: "obj", x: 3, y: 3, d: "stone", c: 0}
```

### 4. Movement Blocking

**Expected Behavior:**
- Objects with block=1 prevent player movement
- Objects with block=0 allow player movement

**How to Test:**
1. Move player to (2,3)
2. Try to move right to (3,3) where stone is
3. Movement should be blocked
4. Move player to (4,3)
5. Try to move right to (5,3) where wood is
6. Movement should succeed (wood doesn't block)

### 5. Multi-Player Synchronization

**Expected Behavior:**
- When one player picks up an object, all players in the same map see the update
- Object count updates in real-time

**How to Test:**
1. Connect two clients to the same map
2. Have player 1 pick up an object
3. Verify player 2 sees the object count decrease
4. Verify both clients show the same state

### 6. Distance Validation

**Expected Behavior:**
- Pickup only works when player is adjacent (within 1 tile) or on the tile
- Pickup from distance should be rejected

**How to Test:**
1. Position player at (1,1)
2. Try to pickup object at (5,3) via console
3. Verify server rejects (check server logs)
4. Move player to (4,3) (adjacent to object)
5. Try pickup again
6. Verify it succeeds

**Expected Server Log:**
```
Pickup too far (when distance > 1)
Object picked up (when distance <= 1)
```

## Protocol Message Reference

### obj_tpl (Object Template)
Sent by server on player login
```javascript
{
  type: "obj_tpl",
  tpl: "stone",              // Template key
  name: "Stone",             // Display name
  desc: "A solid piece...",  // Description
  stack: 1,                  // Can stack (0 or 1)
  pickup: 1,                 // Can pickup (0 or 1)
  block: 1,                  // Blocks movement (0 or 1)
  spr: 10,                   // Sprite index (+ = items, - = tile)
  build: ""                  // Build string (empty for simple objects)
}
```

### o (Object Placement)
Sent by server on login/viewport change
```javascript
{
  type: "o",
  x: 3,        // X position
  y: 3,        // Y position
  d: "stone",  // Template key
  c: 2         // Count (optional, defaults to 1)
}
```

### obj (Object Update)
Sent by server after state change (pickup, etc)
```javascript
{
  type: "obj",
  x: 3,        // X position
  y: 3,        // Y position
  d: "stone",  // Template key
  c: 1         // New count (0 = removed)
}
```

### pickup (Pickup Request)
Sent by client to pickup object
```javascript
{
  type: "pickup",
  x: 3,        // X position of object
  y: 3,        // Y position of object
  tpl: "stone" // Template key
}
```

## Troubleshooting

### Objects not appearing
- Check server logs for "ObjectService initialized"
- Verify test.json has objectPlacements defined
- Confirm map version was incremented (forces reload)
- Check viewport bounds include object positions

### Pickup not working
- Verify player is adjacent to object (distance <= 1)
- Check console for validation errors
- Confirm object exists at specified position
- Verify template is pickupable (pickup=1)

### Movement not blocked
- Verify object template has block=1
- Check PlayerService logs for collision detection
- Confirm ObjectService is initialized in World
- Verify object actually exists at position (not picked up)

### Multi-player desync
- Check that broadcastInMap is working
- Verify both clients are on same map
- Confirm obj messages are being sent
- Check network tab for message delivery

## Automated Tests

Run automated tests to verify implementation:

```bash
# Test object system
node test-objects.js

# Test existing functionality (regression)
node test-deep-water.js
```

Expected result: All tests passing (43 total)

## Security Considerations

1. **Distance Validation**: Server validates pickup distance to prevent cheating
2. **Template Validation**: Unknown templates are rejected
3. **Position Validation**: Coordinates are validated in protocol schema
4. **Rate Limiting**: Existing rate limiting prevents pickup spam

## Performance Notes

- Object state is stored in memory (Map data structure)
- Lookup is O(1) by position key
- Viewport filtering prevents sending all objects to every player
- Broadcast is O(n) where n = players in map (acceptable for typical server sizes)

## Future Enhancements

See TODOs in code:
1. Database persistence for object state
2. Proper inventory management integration
3. Object respawn timers
4. Dynamic object spawning
5. Object interactions beyond pickup
