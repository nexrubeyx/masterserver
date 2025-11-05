# Inventory Swap Feature Documentation

## Overview
This feature allows players to swap items between inventory slots using the `sw` (swap) packet.

## Packet Format
```json
{
  "type": "sw",
  "slot": 7,
  "swap": 0
}
```

### Parameters
- `type`: Must be `"sw"` (required)
- `slot`: Source slot number (0-99) (required)
- `swap`: Destination slot number (0-99) (required)

## Behavior
- Swaps the items at positions `slot` and `swap` in the player's inventory
- Works with empty slots (moves item to empty slot)
- If both slots are the same, no action is taken
- Updates are automatically sent to the client
- Changes are persisted to the database

## Validation
- Both slot numbers must be between 0 and 99 (inclusive)
- Invalid slot numbers are rejected
- Packet structure is validated by JSON Schema

## Implementation Details
### Files Modified
1. **src/protocol/schema.js**: Added schema validation for `sw` packet type
2. **src/services/itemService.js**: Added `swapInventorySlots()` method
3. **src/controllers/messageRouter.js**: Added handler for `sw` packet type

### Error Handling
- Invalid slot numbers return `{ success: false, message: 'Invalid slot' }`
- Errors are logged but don't crash the server
- Failed swaps don't send updates to the client

## Testing
Run the test suite with:
```bash
node test-swap-inventory.js
```

Tests cover:
- Schema validation (valid and invalid packets)
- Swapping filled slots
- Swapping with empty slots
- Same slot swapping
- Invalid slot numbers
