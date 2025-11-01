# Manual Testing Guide: Player State Persistence & Permission System

## Summary of Changes

This implementation adds:
1. **Full Player State Persistence**: On disconnect and shutdown, the server now saves all player state (mapId, x, y, dir, level, inventory, appearance, speed) to MongoDB
2. **Permission System**: A numeric permission system with levels PLAYER(1), CM(2), GM(3), MASTER(4), with default value of 1 for all users

## Prerequisites

- MongoDB running at `mongodb://127.0.0.1:27017/mlgame`
- Server configured and ready to run
- A client that can connect to the WebSocket server

## Test 1: Verify Full State Persistence on Disconnect

### Steps:
1. Start the server:
   ```bash
   npm start
   ```

2. Connect with a client and login/create a new user

3. Move the character around the map to change position

4. Disconnect the client (close connection)

5. Check MongoDB to verify all state was saved:
   ```javascript
   // In MongoDB shell or GUI:
   use mlgame
   db.players.findOne({ name: "your_username" })
   ```

### Expected Results:
- The player document should have all fields saved:
  - `mapId`: Current map
  - `x`, `y`: Final position
  - `dir`: Direction (0-3)
  - `level`: Character level
  - `inventory`: Array of items
  - `appearance`: Object with body, hair, colors, etc.
  - `speed`: Movement speed
  - `updatedAt`: Recent timestamp

## Test 2: Verify Full State Persistence on Server Shutdown

### Steps:
1. Start the server and connect a client

2. Move around and interact with the game

3. Gracefully shutdown the server (Ctrl+C or SIGTERM)

4. Check MongoDB to verify state was persisted

### Expected Results:
- Same as Test 1 - all player state should be saved

## Test 3: Verify Default Permission on New User Creation

### Steps:
1. Create a brand new user account

2. Check the user document in MongoDB:
   ```javascript
   use mlgame
   db.users.findOne({ username: "new_username" })
   ```

### Expected Results:
- The user document should have `permission: 1` (PLAYER level)

## Test 4: Verify Default Permission on Existing User Login

### Steps:
1. If you have existing users without a `permission` field, login with one

2. Check the user document after login:
   ```javascript
   use mlgame
   db.users.findOne({ username: "existing_username" })
   ```

### Expected Results:
- The user document should now have `permission: 1` added

## Test 5: Verify Permission Helper Functions

### Steps:
1. Use MongoDB shell to test the permission functions:
   ```javascript
   use mlgame
   
   // Find a user
   var user = db.users.findOne({ username: "testuser" })
   
   // Verify they have permission field
   user.permission  // Should be 1
   ```

2. Test setting permissions using the helper:
   ```javascript
   // This requires running code in the server context
   // You can create a test script or use the server REPL
   import { setUserPermission } from './src/models/User.js';
   import { PERMISSIONS } from './src/constants/permissions.js';
   
   // Set user to GM level
   await setUserPermission(userId, PERMISSIONS.GM);
   ```

### Expected Results:
- User permission should update correctly
- hasPermission() function should return appropriate boolean values

## Test 6: End-to-End Flow

### Steps:
1. Start server
2. Create new user → Check DB shows permission=1
3. Login and spawn character
4. Move character to different position
5. Change direction (turn without moving)
6. Disconnect
7. Check DB shows all state saved
8. Reconnect with same user
9. Verify character spawns at exact same position with same direction

### Expected Results:
- User has permission=1
- All player state persists across disconnect/reconnect
- Character resumes exactly where they left off

## Debugging Tips

If tests fail, check:

1. **Server logs**: Look for errors during persistence
   ```bash
   npm start 2>&1 | grep -i "persist\|permission\|error"
   ```

2. **MongoDB logs**: Check for write errors
   ```bash
   # Check mongod logs
   tail -f /var/log/mongodb/mongod.log
   ```

3. **Database indexes**: Ensure indexes are created correctly
   ```javascript
   db.users.getIndexes()
   db.players.getIndexes()
   ```

4. **Check for ObjectId vs String**: Guest users have string IDs, real users have ObjectIds
   ```javascript
   var user = db.users.findOne({ username: "testuser" })
   typeof user._id  // Should be 'object' for real users
   ```

## Known Limitations

1. **Guest users**: Guest users (prefix `guest-`) don't get permission field since they're not persisted in the users collection
2. **Backward compatibility**: `persistPosition()` method still exists for compatibility but is replaced by `persistFullState()` in disconnect/shutdown flows

## Migration for Existing Users

To backfill permissions for all existing users without a permission field:

```javascript
use mlgame
db.users.updateMany(
  { permission: { $exists: false } },
  { $set: { permission: 1, updatedAt: new Date() } }
)
```

## Verification Queries

### Check all users have permissions:
```javascript
db.users.find({ permission: { $exists: false } }).count()
// Should return 0
```

### Check recent player updates:
```javascript
db.players.find({
  updatedAt: { $gte: new Date(Date.now() - 60000) }
}).pretty()
// Shows players updated in last minute
```

### Check full state fields exist:
```javascript
db.players.findOne({ name: "testuser" }, {
  mapId: 1,
  x: 1,
  y: 1,
  dir: 1,
  level: 1,
  speed: 1,
  inventory: 1,
  appearance: 1
})
// All fields should be present
```
