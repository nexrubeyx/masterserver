# Fix: TypeError - jv.lock_body.indexOf is not a function

## Problem

The client was throwing a TypeError when trying to change appearance:
```
Uncaught TypeError: jv.lock_body.indexOf is not a function
    at jv.init_dialogs.p.update_doll (ml.min.js?ver=5.0.9:1:183191)
    at jv.init_dialogs.u.on_change (ml.min.js?ver=5.0.9:1:186481)
```

## Root Cause

The server was sending lock fields (`lb`, `lh`, `lc`) as numbers (`0`) in the `game` packet:
```javascript
{
  type: 'game',
  pr: player.premium || 0,
  lb: 0,  // ❌ Number - causes TypeError
  lh: 0,  // ❌ Number - causes TypeError
  lc: 0   // ❌ Number - causes TypeError
}
```

However, the client code in `ml.min.js` expects these to be strings because it calls `.indexOf()` on them:
```javascript
jv.lock_body.indexOf(t.body.value) === -1 && 
jv.lock_hair.indexOf(t.hair.value) === -1 && 
jv.lock_clothes.indexOf(t.clothes.value) === -1
```

When `jv.lock_body` is a number, it doesn't have an `indexOf` method, causing the TypeError.

## Solution

Changed the lock fields from numbers to empty strings in `src/controllers/messageRouter.js`:

```javascript
{
  type: 'game',
  pr: player.premium || 0,
  lb: '',  // ✓ Empty string - nothing locked
  lh: '',  // ✓ Empty string - nothing locked
  lc: ''   // ✓ Empty string - nothing locked
}
```

### How it works:

1. **Empty string** (`''`) means nothing is locked
   - `''.indexOf(1) === -1` → true (not found)
   - `''.indexOf(5) === -1` → true (not found)
   - All appearance options are available

2. **Comma-separated string** to lock specific items:
   - `'1,5,10'` locks body sprites 1, 5, and 10
   - `'1,5,10'.indexOf('1') !== -1` → true (found, locked)
   - `'1,5,10'.indexOf('2') === -1` → true (not found, not locked)

## Client Logic

The client checks if items are locked using this pattern:
```javascript
// If ALL checks return -1 (not locked) OR user has premium:
if ((jv.lock_body.indexOf(value) === -1 && 
     jv.lock_hair.indexOf(value) === -1 && 
     jv.lock_clothes.indexOf(value) === -1) || 
    jv.premium) {
  // Allow appearance change
} else {
  // Show locked indicator
  t.locked.visible = 1;
  t.apply.enable(0);
}
```

## Changes Made

### 1. `/src/controllers/messageRouter.js` (line 141-143)
Changed lock fields from `0` to `''`:
```diff
- lb: 0,  // Lock body (0 = desbloqueado)
- lh: 0,  // Lock hair (0 = desbloqueado)
- lc: 0   // Lock clothes (0 = desbloqueado)
+ lb: '',  // Lock body (string vazia = nada bloqueado)
+ lh: '',  // Lock hair (string vazia = nada bloqueado)
+ lc: ''   // Lock clothes (string vazia = nada bloqueado)
```

### 2. Documentation Updates
- Updated `PREMIUM_SYSTEM_IMPLEMENTATION.md` to reflect correct data types
- Updated `IMPLEMENTATION_COMPLETE_PREMIUM.md` with proper examples
- Added notes about using `indexOf()` for checking locked items

### 3. Test Coverage
Created `test-lock-fields.js` to verify:
- ✓ Lock fields are strings (not numbers)
- ✓ `indexOf()` method is available
- ✓ Empty strings correctly indicate nothing is locked
- ✓ Client logic simulation works correctly
- ✓ Locked items can be specified with comma-separated strings

## Testing

Run the test suite:
```bash
# Test lock fields fix (test file created but not tracked in git per .gitignore)
node test-lock-fields.js

# Verify no regressions (existing tests in repository)
node test-template-lookup.js
node test-recipe-service.js
```

**Note:** Test files are excluded from git by the repository's .gitignore policy (test-*.js). The test-lock-fields.js file was created to verify this fix locally but is not included in the commit.

All tests pass ✓

## Impact

### Before Fix:
- ❌ Clicking appearance options in the costume dialog throws TypeError
- ❌ Cannot preview appearance changes
- ❌ Dialog becomes unusable

### After Fix:
- ✓ Appearance dialog works correctly
- ✓ Can preview body/hair/clothes changes
- ✓ Lock system properly identifies unlocked items
- ✓ Premium users can change appearance
- ✓ Non-guest users (level >= 1) can change appearance

## Future Enhancements

The lock system now supports restricting specific appearance options:

```javascript
// Example: Lock premium-only appearance items
{
  type: 'game',
  pr: player.premium || 0,
  lb: '5,10,15',    // Body sprites 5, 10, 15 require premium
  lh: '8,12',       // Hair styles 8, 12 require premium
  lc: '7,9,11'      // Clothes 7, 9, 11 require premium
}
```

This can be used to implement:
- Premium-exclusive cosmetics
- Level-gated appearance options
- Event-limited items
- Achievement-unlocked cosmetics

## Technical Notes

The client uses simple string search with `indexOf()`:
- **Not** JSON parsing
- **Not** array deserialization
- Just direct string search: `'1,5,10'.indexOf('5')`

This is why:
- Values must be strings
- Empty string works for "nothing locked"
- Comma-separated format is ideal
- No complex parsing needed

## Compatibility

- ✓ Backward compatible (empty string works like unlocked)
- ✓ No database changes required
- ✓ No client changes required
- ✓ Minimal code change (3 lines)
- ✓ All existing tests pass
