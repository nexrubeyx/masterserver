# Recipe Service Implementation

## Problem

The client was experiencing a critical JavaScript error when connecting to the server:

```
Uncaught SyntaxError: "undefined" is not valid JSON
    at JSON.parse (<anonymous>)
    at update_recipes (ml.min.js?ver=5.0.9:1:59001)
    at update_inventory (ml.min.js?ver=5.0.9:1:57976)
```

### Root Cause

The client code contains the following sequence:

1. Server sends `inv` packet with inventory data
2. Client receives `inv` packet and calls `update_inventory()`
3. `update_inventory()` automatically calls `update_recipes()`
4. `update_recipes()` tries to execute: `build_data = JSON.parse(jv.raw_build_data)`
5. Since `jv.raw_build_data` was `undefined` (never set), JSON.parse fails

The client sets `jv.raw_build_data` when it receives a `bld` packet:
```javascript
if ("bld" === json.type) 
  json.data && (jv.raw_build_data = json.data), update_recipes(), update_build();
```

The server was never sending this `bld` packet, causing the error.

## Solution

### 1. Created Recipe Service (`src/services/recipeService.js`)

A new service that manages recipe/build data:

```javascript
export function getRecipeData() {
  return recipeData; // Object containing recipes
}

export function makeRecipePacket() {
  return {
    type: 'bld',
    data: JSON.stringify(recipeData)
  };
}
```

### 2. Updated Message Router

Modified `src/controllers/messageRouter.js` to send the `bld` packet during login:

```javascript
// 7) Envia dados de receitas/crafting (build data)
world.sendTo(player, makeRecipePacket());

// 8) Envia inventário inicial (vazio)
world.sendTo(player, { type: 'inv', data: [] });
```

The `bld` packet is sent **before** the `inv` packet, ensuring `jv.raw_build_data` is defined before `update_inventory()` is called.

## Recipe Data Structure

The client expects recipe data in the following format:

```javascript
{
  [recipeName]: {
    r: {                    // requirements
      [itemName]: quantity  // item name and quantity needed
    }
  }
}
```

Example with recipes:
```javascript
{
  "campfire": {
    r: {
      "wood": 5,
      "stone": 3
    }
  },
  "wooden_sword": {
    r: {
      "wood": 2,
      "stone": 1
    }
  }
}
```

### Current Implementation

Currently, the server sends an empty recipe object `{}`:
```javascript
const recipeData = {};
```

This is sufficient to prevent the error, as:
1. `JSON.stringify({})` produces `"{}"`
2. `JSON.parse("{}")` produces `{}`
3. The client's loop `for (o in build_data)` simply doesn't execute (no recipes)

### Adding Recipes

To add recipes in the future, simply add entries to `recipeData` in `recipeService.js`:

```javascript
const recipeData = {
  "campfire": {
    r: {
      "wood": 5,
      "stone": 3
    }
  }
};
```

## Testing

A comprehensive test suite was added in `test-recipe-service.js` with 15 tests:

```bash
node test-recipe-service.js
```

All tests pass, verifying:
- Recipe data is a valid object
- Data can be stringified to JSON
- Stringified data can be parsed
- Packet structure is correct
- Client simulation works without errors

## Impact

### Before Fix
- Client throws `SyntaxError: "undefined" is not valid JSON`
- Recipe system is broken
- Console filled with errors

### After Fix
- No JSON parse errors
- Client can properly initialize inventory system
- Recipe system ready for future expansion
- Clean console on login

## Files Changed

1. **src/services/recipeService.js** (new) - Recipe management service
2. **src/controllers/messageRouter.js** - Added `bld` packet sending during login
3. **test-recipe-service.js** (new) - Test suite
4. **README.md** - Added test documentation

## Future Enhancements

1. **Recipe Database**: Store recipes in MongoDB instead of hardcoded
2. **Dynamic Recipes**: Allow admins to add/modify recipes without code changes
3. **Recipe Validation**: Validate recipe requirements against item templates
4. **Crafting System**: Implement server-side crafting logic
5. **Per-Map Recipes**: Allow different recipes on different maps
