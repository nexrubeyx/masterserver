# Manual Testing Guide

This guide provides step-by-step instructions for manually verifying the deep water implementation with a game client.

## Prerequisites

1. MongoDB running on `localhost:27017`
2. Game client (ML client) configured to connect to the server
3. Server started and listening on port 8080 (or configured port)

## Starting the Server

```bash
cd /home/runner/work/masterserver/masterserver
npm start
```

Expected output:
```
Servidor iniciado em ws://0.0.0.0:8080
Mapas carregados na memória: X
```

## Connecting with Client

1. Open the game client in a browser
2. Connect to the server (it will try `ws://host:8080` as fallback)
3. Login or enter as guest

## Verification Checklist

### 1. Map Loading
- [ ] Client loads the "caverealm" (test2) map
- [ ] Map dimensions are 15x15
- [ ] Map title shows "Custom Map - Deep Water Test"

### 2. Visual Rendering - Lake Structure
Observe the lake centered in the map:

**Outer Ring (Shallow Water - Tile 36)**
- [ ] Light blue/turquoise color
- [ ] Smooth blending with ground tiles (#22)
- [ ] No harsh edges between ground and shallow water
- [ ] Edge sprites show proper transitions

**Middle Ring (Deep Water Static - Tile 248)**
- [ ] Darker blue than shallow water
- [ ] Smooth blending with shallow water (inner edge)
- [ ] Smooth blending with animated core (outer edge)
- [ ] Edge sprites show category 1→2 transitions

**Core Area (Deep Water Animated - Tile 325)**
- [ ] Animated overlay visible
- [ ] Animation toggles/pulses periodically
- [ ] Occupies center of the lake
- [ ] Uses same color as deep water

### 3. Edge Blending Behavior
Check that adjacent tiles of different categories create smooth transitions:

- [ ] Ground (tile 22) → Shallow (tile 36): Smooth edge blending
- [ ] Shallow (tile 36) → Deep Static (tile 248): Smooth edge blending
- [ ] Deep Static (tile 248) → Animated (tile 325): Smooth edge blending

### 4. Animation Behavior
For the core area (tile 325):

- [ ] Overlay animation is visible
- [ ] Animation toggles on/off periodically
- [ ] Animation matches client's global timer
- [ ] Animation does NOT affect edge blending

### 5. Movement Testing

**Walking on Ground (Tile 22)**
- [ ] Player can walk freely on ground tiles
- [ ] No issues or delays

**Walking on Shallow Water (Tile 36)**
- [ ] Player can walk on shallow water tiles
- [ ] Movement speed is normal
- [ ] No blocking occurs

**Attempting to Walk on Deep Water Static (Tile 248)**
- [ ] Player is BLOCKED at the edge
- [ ] Player cannot enter deep water tiles
- [ ] Character stops at the boundary
- [ ] Direction change works but no movement into water

**Attempting to Walk on Deep Water Animated (Tile 325)**
- [ ] Player is BLOCKED at the edge
- [ ] Player cannot enter animated water tiles
- [ ] Same behavior as deep static tiles

### 6. Client Console Checks (F12 Developer Tools)

Check browser console for:
- [ ] No JavaScript errors
- [ ] Map tiles received correctly (`type: 'map'` messages)
- [ ] Tile IDs in messages match expected values (36, 248, 325)
- [ ] Animation updates firing correctly

## Expected Behavior Summary

```
┌─────────────────────────────────────┐
│  Map Layout (Top View)              │
│                                     │
│    ░░░░░░░░░░░░░░░                 │
│    ░############# ░                │
│    ░#####~~~~~### ░                │
│    ░####~~≈≈≈~~## ░                │
│    ░###~~≈≈≋≈≈~~# ░                │
│    ░##~~≈≈≋≋≋≈≈~~ ░                │
│    ░##~≈≈≋≋≋≋≋≈≈~ ░                │
│    ░##~≈≋≋≋≋≋≋≋≈~ ░                │
│    ░##~≈≈≋≋≋≋≋≈≈~ ░                │
│    ░##~~≈≈≋≋≋≈≈~~ ░                │
│    ░###~~≈≈≋≈≈~~# ░                │
│    ░####~~≈≈≈~~## ░                │
│    ░#####~~~~~### ░                │
│    ░############# ░                │
│    ░░░░░░░░░░░░░░░                 │
│                                     │
│  Legend:                            │
│    ░ = void (0)                    │
│    # = ground (22) - walkable      │
│    ~ = shallow (36) - walkable     │
│    ≈ = deep static (248) - BLOCKED │
│    ≋ = deep animated (325) - BLOCKED│
└─────────────────────────────────────┘
```

## Movement Test Path

1. Start at position (7, 1) - ground near top
2. Walk south toward the lake
3. Reach shallow water at position ~(7, 2)
   - Should be able to walk through
4. Continue to deep water edge at position ~(7, 5)
   - Should be BLOCKED, cannot proceed
5. Try walking around the perimeter
   - Confirm blocking at all deep water edges

## Debugging Tips

### If tiles don't render correctly:
- Check browser console for tile ID mismatches
- Verify map version updated in MongoDB (should be version 2)
- Restart server to reload map data

### If movement isn't blocked:
- Check playerService.js loaded correctly
- Verify isDeepWater import succeeded
- Check player object has canSwim=false (or undefined)

### If animation doesn't work:
- This is client-side behavior (not server issue)
- Check client's update_map function
- Verify tile 325 is received correctly in 'map' message

## Success Criteria

All items checked = Implementation verified successfully!

If any issues occur, refer to:
- `DEEP_WATER_IMPLEMENTATION.md` - Technical details
- `IMPLEMENTATION_SUMMARY.md` - Complete overview
- `test-deep-water.js` - Automated test examples

## Advanced Testing (Optional)

### Testing with canSwim Flag

If you want to test the swim functionality:

1. Modify player object to have `canSwim: true`
2. Reconnect to server
3. Verify:
   - [ ] Player CAN now walk on deep water (248, 325)
   - [ ] Shallow water still works normally
   - [ ] Movement is not blocked anymore

Note: This requires code modification as there's no in-game command to set canSwim yet.

## Reporting Issues

If you find any issues during manual testing:

1. Note the specific tile ID involved
2. Record the player position (x, y)
3. Check browser console for errors
4. Verify expected vs. actual behavior
5. Report with screenshots if possible

## Conclusion

This implementation provides the foundation for water-based gameplay mechanics. Future enhancements can include swim skills, water damage, and additional water types (lava, ice, etc.).
