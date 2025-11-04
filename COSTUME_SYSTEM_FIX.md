# Costume/Appearance System Fix - Implementation Summary

## Overview
This document describes the fixes and improvements made to the costume/appearance change system to address the issues reported.

## Issues Fixed

### 1. **dx and dy Coordinate Mismatch**
**Problem:** In the player snapshot packet, `dy` was set to `player.y` (the Y coordinate) instead of `0`, which caused confusion since `dx` was correctly set to `0`.

**Solution:** Fixed `dy` to be `0` (matching `dx`) to properly represent visual offsets. Both `dx` and `dy` are now consistently `0` (no visual offset).

**File Changed:** `src/services/playerService.js`

```javascript
// BEFORE
dx: 0,  // Delta X sempre 0
dy: player.y,  // Delta Y é a coordenada Y atual do player

// AFTER
dx: 0,  // Delta X sempre 0 (sem offset visual)
dy: 0,  // Delta Y sempre 0 (sem offset visual)
```

### 2. **Incorrect Costume Response Format**
**Problem:** The server was returning `type: "cb"` instead of the expected `type: "c"` with `r: "ap"` format when validating and changing clothes.

**Solution:** Changed the response format to match the client protocol:

```javascript
// Expected format (from problem statement):
{
  "type": "c",
  "r": "ap",
  "c": 1,
  "b": 1,
  "h": 21,
  "cc": 14540253,
  "hc": 6504471,
  "ec": 9682175,
  "nc": 16777215
}
```

**File Changed:** `src/controllers/messageRouter.js`

### 3. **Missing Validation for Available Clothes**
**Problem:** The system didn't validate whether requested clothes, body, hair, or colors were actually available on the server, allowing players to potentially use non-existent items.

**Solution:** Created comprehensive validation system with FREE and PREMIUM item lists:

**File Created:** `src/constants/appearance.js`

- **FREE_CLOTHES:** 20 clothes available to all players (IDs 1-20)
- **PREMIUM_CLOTHES:** 20 premium clothes (IDs 21-40)
- **FREE_BODY:** 10 body types available to all (IDs 1-10)
- **PREMIUM_BODY:** 10 premium body types (IDs 11-20)
- **FREE_HAIR:** 25 hair styles available to all (IDs 1-25)
- **PREMIUM_HAIR:** 15 premium hair styles (IDs 26-40)
- **FREE_COLORS:** 24 colors available to all
- **PREMIUM_COLORS:** 20 premium colors

### 4. **Overly Restrictive Premium Requirement**
**Problem:** The system required `premium > 1` to change appearance, which prevented players with exactly 1 day of premium from using the feature.

**Solution:** Changed logic to `premium > 0` (any premium is valid) and added proper validation based on item availability:

```javascript
// BEFORE
const isPremium = player.premium > 1;
if (!isPremium) {
  // Block all appearance changes
}

// AFTER
const isPremium = (player.premium || 0) > 0;
// Validate each item individually
const validation = validateAppearanceChanges(changes, isPremium);
```

### 5. **Appearance Not Broadcasting to All Clients**
**Problem:** The system was using `sendToOthersInMap()` which didn't update the player's own view.

**Solution:** Changed to `sendToAllInMap()` to ensure all players (including the one making changes) see the updated appearance.

```javascript
// BEFORE
world.sendToOthersInMap(player, templatePacket);

// AFTER
world.sendToAllInMap(player, templatePacket);
```

## New Features

### Validation System
The new validation system provides several key benefits:

1. **Server Authority:** Server controls what items are available
2. **Free/Premium Separation:** Clear distinction between free and premium content
3. **Extensible:** Easy to add new items by updating the constants
4. **User-Friendly Error Messages:** Specific error messages for validation failures

### Validation Functions

#### `isClothesAllowed(clothes, isPremium)`
Validates if a clothes ID is allowed for the player.

#### `isBodyAllowed(body, isPremium)`
Validates if a body ID is allowed for the player.

#### `isHairAllowed(hair, isPremium)`
Validates if a hair ID is allowed for the player.

#### `isColorAllowed(color, isPremium)`
Validates if a color is allowed for the player.

#### `validateAppearanceChanges(changes, isPremium)`
Validates all requested appearance changes at once and returns:
- `{ valid: true }` if all changes are allowed
- `{ valid: false, reason: "..." }` if any change is not allowed

## Updated Message Flow

### Successful Costume Change
1. Client sends `costume` message with desired changes
2. Server validates player has permission for requested items
3. Server updates player appearance in memory
4. Server persists changes to database
5. Server sends success response with **full appearance data**:
   ```json
   {
     "type": "c",
     "r": "ap",
     "c": <clothes>,
     "b": <body>,
     "h": <hair>,
     "cc": <clothes_color>,
     "hc": <hair_color>,
     "ec": <eye_color>,
     "nc": <name_color>
   }
   ```
6. Server broadcasts `plr_tpl` packet to all players in map

### Failed Costume Change
1. Client sends `costume` message with desired changes
2. Server validates and finds invalid item
3. Server sends error response:
   ```json
   {
     "type": "c",
     "r": "er",
     "msg": "Clothes requires premium or is not available"
   }
   ```

## Testing

### Test Files Created
1. **test-appearance-validation.js:** Tests validation functions
   - FREE/PREMIUM item validation
   - Color validation
   - Complete appearance change validation
   - Invalid ID handling

2. **test-costume-integration.js:** Tests complete costume flow
   - FREE player valid changes
   - FREE player blocked from PREMIUM items
   - PREMIUM player using PREMIUM items
   - PREMIUM player using FREE items
   - Response format validation
   - Template packet generation
   - Snapshot packet with dx=0, dy=0

### Running Tests
```bash
node test-appearance-validation.js
node test-costume-integration.js
```

All tests pass successfully! ✓

## Client Compatibility

The changes maintain full compatibility with the existing client protocol:

1. **Snapshot Packet:** Now correctly uses `dx: 0, dy: 0`
2. **Costume Response:** Uses expected format `type: "c", r: "ap"`
3. **Template Broadcast:** Updates all clients with new appearance
4. **Error Handling:** Provides clear error messages

## Database

No database schema changes required. The existing `appearance` object in the `players` collection stores all appearance data:

```javascript
appearance: {
  body: Number,
  hair: Number,
  clothes: Number,
  hairColor: Number,
  clothesColor: Number,
  eyeColor: Number,
  nameColor: Number,
  sprite: Number
}
```

## Security

- **Server Authority:** All validation happens server-side
- **Input Validation:** Schema validates all costume messages
- **Range Checks:** Colors limited to 0-16777215 (0x000000-0xFFFFFF)
- **Item Whitelisting:** Only defined items in FREE/PREMIUM lists are allowed
- **No Client Trust:** Server doesn't trust client's premium status

## Future Enhancements

Potential improvements:
1. Add more FREE and PREMIUM items as game content expands
2. Implement seasonal/event-exclusive items
3. Add item unlock system (achievements, quests)
4. Add preview system for premium items
5. Add color palette customization
6. Track costume change history

## Summary

All requirements from the problem statement have been addressed:

✅ Fixed `dx` and `dy` to match (both 0)  
✅ Costume system now works correctly  
✅ Server returns correct format: `{"type":"c","r":"ap","c":1,"b":1,"h":21,...}`  
✅ Added all FREE clothes and colors  
✅ Added all PREMIUM clothes and colors  
✅ Prevents users from using non-existent items  
✅ User's clothes update for all clients in the map

The system is now fully functional, validated, and ready for production use.
