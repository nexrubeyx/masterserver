# Premium System and Player Data Enhancement - Implementation Summary

## Overview
This document describes the implementation of the premium system and enhancements to ensure all player data (including dx, dy) is properly sent to clients.

## Changes Made

### 1. User Model (`src/models/User.js`)

#### New Fields
- **premium** (Number): Days of premium remaining (0 = no premium)
- **premiumExpiry** (Date): Date when premium expires (null if no premium)

#### New Functions
```javascript
// Add premium days to a user
addPremiumDays(userId, days)

// Check and update premium status (expires if past date)
checkAndUpdatePremium(userId)
```

#### Behavior
- Premium is tracked in **days** (e.g., premium = 10 means 10 days remaining)
- When premium expires, the field is automatically set to 0
- Premium can be stacked (adding days extends the expiry date)

### 2. Player Service (`src/services/playerService.js`)

#### Enhanced Snapshot Packet
The player snapshot packet now includes:
```javascript
{
  type: 'p',
  id: String(player.sessionId),
  tpl: String(player.sessionId),
  x: player.x,
  y: player.y,
  dx: player.dx || 0,  // NEW: Delta X (offset visual)
  dy: player.dy || 0,  // NEW: Delta Y (offset visual)
  s: player.speed || 300,
  d: player.dir || 0,
  ch: 0
}
```

#### Enhanced Template Packet
The player template packet now includes premium:
```javascript
{
  type: 'plr_tpl',
  id: String(player.sessionId),
  n: player.name,
  t: '',
  l: player.level,
  p: player.appearance.nameColor,
  pr: player.premium || 0,  // NEW: Premium days
  s: player.appearance.sprite,
  b: player.appearance.body,
  h: player.appearance.hair,
  hc: player.appearance.hairColor,
  c: player.appearance.clothes,
  cc: player.appearance.clothesColor,
  ec: player.appearance.eyeColor
}
```

### 3. Authentication Service (`src/services/authService.js`)

#### Premium Loading on Login
- During login, premium status is checked and updated via `checkAndUpdatePremium()`
- Expired premium is automatically set to 0
- Premium value is attached to the player object for easy access

### 4. Message Router (`src/controllers/messageRouter.js`)

#### New "game" Packet During Login
After authentication, the server sends:
```javascript
{
  type: 'game',
  pr: player.premium || 0,  // Premium days
  lb: 0,  // Lock body (0 = unlocked)
  lh: 0,  // Lock hair (0 = unlocked)
  lc: 0   // Lock clothes (0 = unlocked)
}
```

This packet is expected by the client to enable premium features.

#### New "costume" Message Handler
Handles appearance changes from clients:
```javascript
{
  type: 'costume',
  body: 1,           // Optional: new body sprite
  hair: 2,           // Optional: new hair sprite
  clothes: 3,        // Optional: new clothes sprite
  hair_color: 6504471,      // Optional: new hair color
  clothes_color: 14540253,  // Optional: new clothes color
  eye_color: 255            // Optional: new eye color
}
```

**Permission Logic:**
- Requires premium (premium > 0) OR non-guest (level >= 1 and name doesn't start with "guest-")
- Guests without premium cannot change appearance
- Changes are persisted to the database
- All players in the same map see the updated appearance

**Response:**
```javascript
{
  type: 'cb',
  r: 'Appearance changed successfully',  // Result message
  pr: player.premium || 0                 // Updated premium days
}
```

### 5. Protocol Schema (`src/protocol/schema.js`)

#### New Message Type
Added validation for the "costume" message type:
- All fields are optional (can change just one aspect)
- Values must be within valid ranges (0-100 for sprites, 0-16777215 for colors)
- Invalid values are rejected

## Client Protocol Compatibility

### Expected by Client
The client (ml.min.js) expects:

1. **json.pr** field in:
   - "plr_tpl" packets (player template)
   - "game" packets (game initialization)
   - "cb" packets (costume buy response)

2. **json.dx** and **json.dy** fields in:
   - "p" packets (player snapshot)

3. Premium enables:
   - Costume button visibility
   - Diamonds button visibility
   - Ability to change appearance

### Costume System Flow
1. Client opens costume dialog (if premium or level >= 1)
2. Client sends "costume" message with desired changes
3. Server validates premium/level
4. Server updates player appearance
5. Server persists to database
6. Server sends "cb" response to confirm
7. Server broadcasts updated template to all players in map

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  username: String,
  passwordHash: String,
  email: String | null,
  premium: Number,           // NEW: Days of premium
  premiumExpiry: Date | null, // NEW: Expiry date
  permission: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Players Collection
No changes to database schema - appearance fields already exist.
Premium field is added to the runtime player object during login.

## Usage Examples

### Add Premium to User
```javascript
import { addPremiumDays } from './src/models/User.js';

// Add 30 days of premium to user
await addPremiumDays(userId, 30);
```

### Check Premium Status
```javascript
import { checkAndUpdatePremium } from './src/models/User.js';

// Returns days remaining (0 if expired)
const daysRemaining = await checkAndUpdatePremium(userId);
```

### Change Appearance (Client)
```javascript
// Client sends costume change request
ws.send(JSON.stringify({
  type: 'costume',
  body: 2,
  hair: 5,
  hair_color: 0xFF5733
}));
```

## Testing

### Test Files Created
1. **test-premium-system.js** - Tests premium calculation and validation logic
2. **test-protocol-premium.js** - Tests protocol schema and packet structures

### Running Tests
```bash
# Test premium system
node test-premium-system.js

# Test protocol changes
node test-protocol-premium.js

# Run existing tests to ensure compatibility
node test-template-lookup.js
node test-recipe-service.js
node test-tile-system.js
```

All tests should pass without errors.

## Backward Compatibility

- Existing users without premium fields will have them automatically initialized to 0/null
- Guest users continue to work as before (no premium)
- Non-premium players can still change appearance if they're not guests (level >= 1)
- All existing functionality remains unchanged

## Security Considerations

- Premium status is validated server-side before allowing appearance changes
- Premium cannot be modified by client (server-authoritative)
- Database updates are atomic and safe
- Invalid costume values are rejected by schema validation

## Future Enhancements

Possible extensions:
1. Premium purchase system (integrate with payment gateway)
2. Premium-only items/features
3. Premium tier system (bronze/silver/gold)
4. Auto-renewal of premium
5. Premium gifts between players
6. Premium history/logs

## Summary

This implementation provides:
- ✅ Complete premium system with day-based tracking
- ✅ All player data (including dx, dy) sent to clients
- ✅ Costume change system with premium validation
- ✅ Client protocol compatibility
- ✅ Database persistence
- ✅ Comprehensive testing
- ✅ Backward compatibility
- ✅ Server-authoritative security
