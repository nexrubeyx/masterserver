# Fix: Costume System Player List Packet

## Problem
When opening the costume shop for the first time, the server was not sending the player list (pl) packet, which is needed to properly display player positions in the game while the costume shop is open.

## Solution
Modified the costume shop request handler in `src/controllers/messageRouter.js` to include the player list packet when the costume shop is opened for the first time.

## Changes Made

### File: src/controllers/messageRouter.js
**Lines 332-354**: Added logic to include player list (pl) packet

Before:
```javascript
if (isFirstRequest) {
  session._costumeShopSent = true;
  const shopPackets = makeCostumeShopPacket(player, user);
  world.sendRaw(ws, {
    type: 'pkg',
    data: JSON.stringify([...shopPackets, JSON.stringify(costumePacket)])
  });
}
```

After:
```javascript
if (isFirstRequest) {
  session._costumeShopSent = true;
  
  // Get all visible players for the player list packet
  const allPlayersInMap = world.getPlayersInMap(player.mapId);
  const visiblePlayers = allPlayersInMap.filter(p => {
    return world.playerService.isPlayerInViewRange(player, p);
  });
  
  // Create player list packet (pl with p entries)
  const plData = world.playerService.makePlayerListData(visiblePlayers);
  const plPacket = JSON.stringify({
    type: 'pl',
    data: plData
  });
  
  // Send all packets including player list
  const shopPackets = makeCostumeShopPacket(player, user);
  world.sendRaw(ws, {
    type: 'pkg',
    data: JSON.stringify([plPacket, ...shopPackets, JSON.stringify(costumePacket)])
  });
}
```

## Packet Structure

### Before Fix
When opening costume shop for first time:
```json
{
  "type": "pkg",
  "data": "[
    {\"type\":\"fx_tpl\",\"tpl\":\"costume_shop\",...},
    {\"type\":\"fx\",\"tpl\":\"costume_shop\",...},
    {\"type\":\"costumes\",\"c\":[...],\"l\":{...}}
  ]"
}
```
**Missing**: Player list (pl) packet

### After Fix
When opening costume shop for first time:
```json
{
  "type": "pkg",
  "data": "[
    {\"type\":\"pl\",\"data\":[{\"type\":\"p\",\"id\":...,\"x\":...,\"y\":...}]},
    {\"type\":\"fx_tpl\",\"tpl\":\"costume_shop\",...},
    {\"type\":\"fx\",\"tpl\":\"costume_shop\",...},
    {\"type\":\"costumes\",\"c\":[...],\"l\":{...}}
  ]"
}
```
**Now includes**: Player list (pl) packet with all visible players

## Testing

Created `test-costume-shop-packet.js` to verify:
1. ✓ makeCostumeShopPacket returns correct array
2. ✓ fx_tpl packet has correct structure
3. ✓ fx packet has correct structure
4. ✓ costumes packet has correct structure
5. ✓ Complete packet includes all 4 sub-packets in correct order

All tests pass successfully.

## Code Review
- Minor code duplication noted (acceptable for minimal changes)
- Functionality is correct and complete
- No breaking changes to existing behavior

## Security
- CodeQL analysis: 0 alerts found
- No security vulnerabilities introduced

## Backward Compatibility
- ✓ Subsequent requests (not first time) still work the same
- ✓ Only adds player list on first costume shop open
- ✓ No changes to costume purchase or try-on functionality

## Impact
This fix ensures that when players open the costume shop, they can still see other players moving around them, maintaining game immersion and proper client state synchronization.
