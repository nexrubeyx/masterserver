# Implementation Summary: Departure Message and Effect

## Problem Statement (Portuguese)
> "apos os 1m de seep ele deve enviar isso para os outros jogadores"
> 
> Translation: "after 1 minute of sleep it should send this to other players"

The requirement was to send a departure message with a visual effect ("poofed") to other players after the 1-minute sleep timeout expires.

## Solution

### Modified File: `src/state/world.js`

Updated the `finalizeDisconnect()` method to send a comprehensive departure packet when a player's sleep timeout expires (after 1 minute of inactivity).

#### Packet Structure
The server now sends a "pkg" type packet containing multiple sub-packets:

```json
{
  "type": "pkg",
  "data": "[
    {\"type\":\"message\",\"text\":\"<span style='color:#99ff99'>guest-71018 has left.</span>\"},
    {\"type\":\"fx_tpl\",\"tpl\":\"poofed\",\"code\":\"...\"},
    {\"type\":\"fx\",\"tpl\":\"poofed\",\"x\":16,\"y\":15,\"s\":\"pop\",\"d\":16777215},
    {\"type\":\"pl\",\"data\":[...]}
  ]"
}
```

#### Components:
1. **Message**: Green text announcing "[PlayerName] has left."
2. **Effect Template (fx_tpl)**: Defines the "poofed" particle effect with 15 sprites that fade and scale
3. **Effect (fx)**: Instantiates the effect at the player's last position with a "pop" sound
4. **Player List (pl)**: Updated list of remaining players in the map

### New Test File: `test-departure-effect.js`

Comprehensive test that validates:
- Sleep mode activation on disconnect
- "goes to sleep" message sent immediately
- After timeout, "pkg" packet is sent with all 4 components
- Each component has correct structure and data
- Effect is positioned at player's last coordinates

## Flow

1. **Disconnect** → Player enters sleep mode, others see "goes to sleep"
2. **Wait 60 seconds** (configurable via SLEEP_TIMEOUT_MS)
3. **Timeout expires** → Other players receive:
   - Departure message: "[Name] has left."
   - Visual effect: "poofed" particles at player's position
   - Sound effect: "pop"
   - Updated player list without the departed player

## Testing Results

All tests pass successfully:
- ✅ `test-sleep-disconnect.js` - Original sleep functionality
- ✅ `test-sleep-reconnect.js` - Reconnection during sleep
- ✅ `test-departure-effect.js` - New departure packet validation
- ✅ `test-duplicate-login.js` - Duplicate login handling
- ✅ `test-ghost-player-fix.js` - Ghost player cleanup
- ✅ `test-pl-broadcast-on-attach.js` - Player list broadcasting

Security: **0 vulnerabilities** found by CodeQL

## Backward Compatibility

The change is fully backward compatible:
- No database schema changes
- No breaking changes to existing functionality
- Existing clients will receive the new packet format
- Sleep behavior remains the same (1 minute delay, reconnection support)

## Code Quality

- Follows existing project conventions (Portuguese comments/logs)
- Consistent with existing code style
- Minimal changes (surgical modification to one method)
- Comprehensive error handling
- Well-tested with dedicated test file
