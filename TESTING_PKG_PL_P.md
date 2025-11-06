# Testing the PKG > PL > P System

This directory contains tests and demos for the PKG > PL > P packet hierarchy system.

## Quick Start

Run all tests to verify the system works correctly:

```bash
# Test packet structure
node test-pkg-pl-p-structure.js

# Test movement integration
node test-movement-integration.js

# Visual demo (shows packet structure like problem statement)
node demo-pkg-pl-p-visual.js
```

## Test Files

### test-pkg-pl-p-structure.js
Tests the basic packet structure:
- ✅ pl packets are automatically wrapped in pkg
- ✅ p packets are correctly inside pl packets
- ✅ No duplication of pl packets occurs
- ✅ Empty pkg packets get pl auto-added
- ✅ pkg packets with existing pl don't get duplicates

### test-movement-integration.js
Tests the complete movement flow:
- ✅ Player movement generates pl packets
- ✅ pl packets are wrapped in pkg packets
- ✅ p packets are inside pl packets
- ✅ Visible players receive position updates
- ✅ Packet structure matches: pkg > pl > p

### demo-pkg-pl-p-visual.js
Visual demonstration showing:
- Player moving west (x: 46 → 45)
- Complete packet hierarchy breakdown
- Console log format matching problem statement

## Expected Output

All tests should show:
```
✅ ALL TESTS PASSED
```

The demo shows a visual representation of the packet structure:
```
pkg (package)
 └─ pl (player list)
     └─ p (player snapshot)
```

## Existing Tests

These tests also verify the system continues to work correctly:

```bash
node test-chunk-broadcast.js
node test-coordinate-synchronization.js
node test-single-tile-movement.js
node test-movement-blocking.js
node test-non-walkable-tiles.js
```

## Documentation

For detailed information, see:
- `PKG_PL_P_SYSTEM_DOCUMENTATION.md` - Complete system documentation
- `IMPLEMENTATION_COMPLETE_PKG_PL_P.md` - Implementation summary

## Problem Statement Reference

The system now correctly implements the format shown in the problem statement:

```javascript
🧩 TYPE 'p' dentro de PL → PKG
{
  "type": "p",
  "id": 39094,
  "tpl": 39094,
  "s": 323,
  "d": 3,
  "x": 46,
  "y": 8,
  "dx": 43,
  "dy": 15
}
```

Where:
- `type: "p"` = Player snapshot packet
- `id` = Session ID
- `tpl` = Template ID (same as session ID for players)
- `s` = Speed in milliseconds per tile
- `d` = Direction (0=up, 1=right, 2=down, 3=left)
- `x, y` = Current position
- `dx, dy` = Destination position (next tile if moving)

## How It Works

1. **Player moves** → `tickPlayer()` processes movement
2. **Mark dirty** → Sets `_pendingSnapshot = true`
3. **Flush snapshots** → `flushPendingSnapshots()` creates 'pl' packet
4. **Auto-wrap** → `sendRaw()` wraps 'pl' in 'pkg' automatically
5. **Send to client** → Client receives: `pkg > pl > p`

## Troubleshooting

If tests fail:
1. Ensure Node.js 22+ is installed
2. Run `npm install` to install dependencies
3. Check that no other process is using port 8080

## Success Criteria

All tests should pass with:
- ✅ 0 syntax errors
- ✅ 0 security vulnerabilities (CodeQL)
- ✅ Correct packet hierarchy: pkg > pl > p
- ✅ No duplicate pl packets
- ✅ All existing tests continue to pass
