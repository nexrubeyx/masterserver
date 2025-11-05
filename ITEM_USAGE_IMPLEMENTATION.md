# Item Usage Packet Implementation

## Overview
This implementation adds support for the `type: 'u'` packet that allows players to use consumable items from their inventory.

## Problem Statement
The requirement was to implement: `{"type":"u","slot":6} pacote para usar um iten` (packet to use an item)

## Changes Made

### 1. Protocol Schema (`src/protocol/schema.js`)
- Added schema validation for type `'u'` messages
- Validates required fields: `type` and `slot`
- Ensures `slot` is an integer between 0-99
- Prevents additional properties from being sent

### 2. Message Router (`src/controllers/messageRouter.js`)
- Added handler for `case 'u'` in the message router
- Validates player session before processing
- Calls `ItemService.useItem(player, slot)` to handle the item usage
- Logs warnings on failure with error details
- Sends error messages back to the client via `logmsg` packet
- Logs success with item effect details

### 3. Testing
- Created comprehensive test file (`test-item-usage.js`)
- Validates schema correctly accepts valid packets
- Validates schema rejects invalid packets (missing slot, out of range, negative)
- Tests `ItemService.useItem()` with consumable items
- Tests error handling for empty slots
- Tests error handling for non-consumable items
- All tests pass successfully

## Usage

### Client sends:
```json
{
  "type": "u",
  "slot": 6
}
```

### Server response on success:
- Inventory is updated (item quantity reduced by 1 or removed if last unit)
- Item effects are applied (heal, mana, etc.)
- Client receives updated inventory via `inv` packet
- Server logs the success with effect details

### Server response on failure:
- Client receives error message via `logmsg` packet
- Server logs warning with error details
- Possible errors:
  - "Item not found" - slot is empty
  - "Item cannot be used" - item is not consumable
  - "Not enough items" - edge case (shouldn't happen with qty >= 1)

## Integration
This implementation:
- Follows existing code patterns and style
- Integrates seamlessly with existing `ItemService`
- Uses existing database persistence methods
- Maintains consistency with other message handlers
- Includes proper error handling and logging

## Security
- CodeQL security scan: 0 alerts found
- Input validation via JSON Schema
- Slot bounds checking (0-99)
- Session validation prevents unauthenticated usage
- No new vulnerabilities introduced

## Testing Results
All 8 tests passed:
✓ Schema validation works correctly
✓ Invalid packets are rejected
✓ ItemService.useItem() works correctly  
✓ Consumable items can be used
✓ Non-consumable items cannot be used
✓ Empty slots are handled properly
✓ Proper error messages are returned
