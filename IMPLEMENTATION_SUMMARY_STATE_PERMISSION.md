# Player State Persistence & Permission System - Implementation Summary

## Overview

This PR implements two key features for the masterserver:

1. **Full Player State Persistence**: Enhanced state saving that persists all player data (not just position) on disconnect and shutdown
2. **Numeric Permission System**: A hierarchical permission system with 4 levels (PLAYER, CM, GM, MASTER)

## Changes Made

### New Files Created

1. **`src/constants/permissions.js`**
   - Defines `PERMISSIONS` object with 4 levels: PLAYER(1), CM(2), GM(3), MASTER(4)
   - `hasPermission(user, minLevel)` - checks if user has required permission level
   - `permissionName(level)` - converts numeric level to string name

2. **`src/models/PlayerState.js`**
   - `savePlayerState()` - persists full player state to MongoDB
   - Saves: mapId, x, y, dir, level, inventory, appearance, speed
   - Uses non-destructive merge (only updates provided fields)

3. **`TESTING_GUIDE_STATE_PERMISSION.md`**
   - Comprehensive manual testing guide
   - 6 test scenarios covering all features
   - Debugging tips and migration queries

4. **`PERMISSION_USAGE_EXAMPLE.js`**
   - Example code showing how to use permissions in command handlers
   - Multiple usage patterns and best practices

### Modified Files

1. **`src/models/User.js`**
   - Added `setUserPermission(userId, level)` - set user permission level
   - Added `ensureUserPermissionDefault(userId, defaultLevel)` - backfill default permission
   - Added `getUserById(userId)` - fetch user by ID

2. **`src/services/playerService.js`**
   - Added import for `savePlayerState`
   - Added `persistFullState(player)` method - saves complete player state
   - Kept `persistPosition(player)` for backward compatibility

3. **`src/state/world.js`**
   - Updated `handleDisconnect()` to call `persistFullState` instead of `persistPosition`
   - Updated `shutdown()` to call `persistFullState` instead of `persistPosition`

4. **`src/services/authService.js`**
   - Added imports for `PERMISSIONS` and `ensureUserPermissionDefault`
   - Updated `ensurePlayer()` to set default permission (PLAYER=1) for real users
   - Permission is set idempotently - only if missing

## Key Features

### Full State Persistence

**Before**: Only position (mapId, x, y) was saved on disconnect
**After**: All player state is saved (mapId, x, y, dir, level, inventory, appearance, speed)

**Triggers**:
- WebSocket disconnect (connection close)
- Server graceful shutdown (SIGINT/SIGTERM)

**Benefits**:
- Players resume exactly where they left off
- Direction, appearance, inventory all preserved
- Better player experience across sessions

### Permission System

**Hierarchy**:
- PLAYER (1) - Default for all users
- CM (2) - Community Manager
- GM (3) - Game Master  
- MASTER (4) - Full administrator

**Features**:
- Numeric levels allow simple comparison (`user.permission >= PERMISSIONS.GM`)
- Default value of 1 for all users (existing and new)
- Helper functions for permission checks
- Easy to extend with more levels if needed

## Backward Compatibility

✅ **No breaking changes**:
- `persistPosition()` method still exists (not removed)
- Only disconnect/shutdown flows use new `persistFullState()`
- Existing code calling `persistPosition()` will continue to work
- New users automatically get permission=1
- Existing users get permission=1 on next login
- Guest users handled correctly (no permission field for string IDs)

## Database Schema

### users collection
```javascript
{
  _id: ObjectId,
  username: string,
  passwordHash: string,
  email: string,
  permission: number,      // NEW: 1-4 (default 1)
  createdAt: Date,
  updatedAt: Date         // NEW: updated on permission change
}
```

### players collection
```javascript
{
  _id: ObjectId,
  userId: string,
  name: string,
  mapId: string,
  x: number,
  y: number,
  dir: number,            // NOW PERSISTED: direction (0-3)
  level: number,          // NOW PERSISTED: always saved
  speed: number,          // NOW PERSISTED: movement speed
  inventory: Array,       // NOW PERSISTED: full inventory
  appearance: Object,     // NOW PERSISTED: complete appearance
  createdAt: Date,
  updatedAt: Date         // Updated on every state save
}
```

## Testing

See `TESTING_GUIDE_STATE_PERMISSION.md` for detailed testing instructions.

### Quick Test Checklist
- [ ] Connect, move, disconnect → verify DB has full state
- [ ] Server shutdown → verify all players saved
- [ ] New user creation → verify permission=1
- [ ] Existing user login → verify permission=1 added
- [ ] Reconnect → verify player spawns at exact position with correct direction

### Migration for Existing Data

To backfill permissions for existing users:
```javascript
use mlgame
db.users.updateMany(
  { permission: { $exists: false } },
  { $set: { permission: 1, updatedAt: new Date() } }
)
```

## Usage Examples

### Checking Permissions
```javascript
import { PERMISSIONS, hasPermission } from './src/constants/permissions.js';

// In a command handler
if (!hasPermission(session.user, PERMISSIONS.GM)) {
  return world.sendTo(ws, { type: 'err', msg: 'Permissão insuficiente.' });
}
```

### Setting Permissions
```javascript
import { setUserPermission } from './src/models/User.js';
import { PERMISSIONS } from './src/constants/permissions.js';

// Promote user to GM
await setUserPermission(userId, PERMISSIONS.GM);
```

See `PERMISSION_USAGE_EXAMPLE.js` for more examples.

## Security Considerations

✅ **Safe Implementation**:
- Permissions default to lowest level (PLAYER=1)
- Permission checks use >= comparison (higher levels inherit lower permissions)
- Guest users (string IDs) don't get permission field but default to 1 in checks
- No breaking changes to protocol packets
- Full state persistence only happens on controlled events (disconnect, shutdown)

## Performance Impact

**Minimal**:
- `persistFullState` called only on disconnect/shutdown (not hot path)
- `ensureUserPermissionDefault` is idempotent (no-op if permission exists)
- MongoDB uses indexed queries for all lookups
- No additional network overhead (same database calls, just more fields)

## Future Enhancements

Possible additions (not in this PR):
- Command system using permission checks
- Admin interface for managing permissions
- Permission-based map access control
- Audit log for permission changes
- Per-command permission requirements
- Custom permission levels between existing ones

## Rollback Plan

If issues are found:
1. Revert World.js changes (use `persistPosition` instead of `persistFullState`)
2. Permission system can stay - it's harmless and defaults work fine
3. No database migration needed to roll back
