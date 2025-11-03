# Tile Format Support in Map JSON Files

## Overview

The map service now supports **three different formats** for defining tiles in map JSON files, plus **automatic LZW compression** for efficient network transmission:

1. **2D Array Format** (original)
2. **Colon-Separated String Format** (new)
3. **Fill Format** (original)
4. **LZW Compression** (automatic, client-compatible)

## Format Details

### 1. 2D Array Format

The traditional format using a nested array structure:

```json
{
  "id": "my-map",
  "version": 1,
  "width": 3,
  "height": 2,
  "tiles": [
    [0, 1, 2],
    [3, 4, 5]
  ]
}
```

**Use case**: Small maps or maps with complex patterns where readability matters.

### 2. Colon-Separated String Format (NEW)

A compact format using a colon-separated string:

```json
{
  "id": "my-map",
  "version": 1,
  "width": 3,
  "height": 2,
  "tiles": "0:1:2:3:4:5"
}
```

The tiles are specified in **row-major order** (left-to-right, top-to-bottom).

**Use case**: Large maps with repeating patterns. This format is much more compact and easier to generate programmatically.

**Example - Large cave realm**:
```json
{
  "id": "cave",
  "version": 1,
  "width": 100,
  "height": 100,
  "tiles": "0:0:0:0:0:...209:209:209:209:..."
}
```

### 3. Fill Format

Fills the entire map with a single tile value:

```json
{
  "id": "my-map",
  "version": 1,
  "width": 100,
  "height": 100,
  "fill": 21
}
```

**Use case**: Uniform maps or as a starting point for procedural generation.

## LZW Compression (NEW)

### What is LZW Compression?

The server now automatically compresses viewport data using **LZW (Lempel-Ziv-Welch)** compression before sending to clients. This is compatible with the client's `jv.unzip` function:

```javascript
jv.unzip = function(e) {
  for (var t, i={}, o=(e+"").split(""), a=o[0], n=a, r=[a], s=57344, l=1; l<o.length; l++) {
    var d=o[l].charCodeAt(0);
    t=d<57344?o[l]:i[d]?i[d]:n+a, r.push(t), a=t.charAt(0), i[s]=n+a, s++, n=t
  }
  return r.join("")
}
```

### Compression Performance

LZW compression is **highly effective** for tile data due to repeating patterns:

| Scenario | Original Size | Compressed Size | Ratio |
|----------|--------------|-----------------|-------|
| Uniform cave (936 tiles) | 2807 chars | 129 chars | **4.6%** |
| Mixed pattern viewport | 2183 chars | 147 chars | **6.7%** |
| Large repeating pattern | 2399 chars | 281 chars | **11.7%** |

**Typical viewport (36×26 tiles)**: ~2000-3000 chars → ~150-300 chars ✨

### How It Works

1. **Server side** (`buildViewportPayload`):
   - Generates tile string: `"0:0:0:209:209:209..."`
   - Applies LZW compression: `compressLZW(tiles)`
   - Sends compressed data to client

2. **Client side**:
   - Receives compressed data
   - Calls `jv.unzip(data)`
   - Renders decompressed tiles

### Smart Compression

The server intelligently decides when to use compression:

- ✅ **Uses compression** if it reduces size by ≥10% and string >50 chars
- ❌ **Skips compression** for small strings or when it doesn't help

This ensures optimal performance in all scenarios.

## Features

### Automatic Conversion

All formats are automatically converted to the internal 2D array format during the normalization phase in `mapService.normalizeMapData()`. This ensures:

- **Backward compatibility**: Existing maps continue to work
- **Consistent internal representation**: All code can work with 2D arrays
- **Format flexibility**: Map designers can choose the most convenient format

### Error Handling

The colon-separated format includes robust error handling:

- **Invalid values**: Non-numeric values are converted to `0`
  - `"1:abc:3"` becomes `[1, 0, 3]`
  
- **Missing values**: If the string has fewer values than `width × height`, remaining tiles are filled with `0`
  - Width=3, Height=2, `"1:2:3"` becomes `[[1,2,3], [0,0,0]]`

- **Extra values**: Extra values beyond `width × height` are ignored

## Examples

### Small Decorative Map

Using colon format for a 10×10 map with a pattern:

```json
{
  "id": "test-pattern",
  "version": 1,
  "title": "Test Pattern Map",
  "width": 10,
  "height": 10,
  "tiles": "0:0:0:0:0:0:0:0:0:0:0:1:1:1:1:1:1:1:1:0:0:1:2:2:2:2:2:2:1:0:0:1:2:3:3:3:3:2:1:0:0:1:2:3:209:209:3:2:1:0:0:1:2:3:209:209:3:2:1:0:0:1:2:3:3:3:3:2:1:0:0:1:2:2:2:2:2:2:1:0:0:1:1:1:1:1:1:1:1:0:0:0:0:0:0:0:0:0:0:0"
}
```

### Large Uniform Map

Using fill format for a large cave:

```json
{
  "id": "cave-realm",
  "version": 1,
  "width": 200,
  "height": 200,
  "fill": 21
}
```

## Implementation Details

The parsing logic is in `src/services/mapService.js`:

```javascript
normalizeMapData(json) {
  // Check if tiles is a string
  if (typeof json.tiles === 'string') {
    // Parse colon-separated string
    const tileValues = json.tiles.split(':').map(v => {
      const num = Number(v);
      return Number.isFinite(num) ? num : 0;
    });
    
    // Convert to 2D array
    json.tiles = [];
    for (let y = 0; y < json.height; y++) {
      const row = [];
      for (let x = 0; x < json.width; x++) {
        const index = y * json.width + x;
        row.push(index < tileValues.length ? tileValues[index] : 0);
      }
      json.tiles.push(row);
    }
  }
  // ... rest of normalization
}
```

## Testing

Run the test suite to verify all formats work correctly:

```bash
node test-tile-format.js        # Unit tests
node test-map-loading.js        # Integration test
node test-backward-compat.js    # Backward compatibility
```

All tests should pass with ✅.

## Benefits

1. **Compactness**: Colon format significantly reduces file size for large maps
2. **Network Efficiency**: LZW compression reduces viewport data by 85-95%
3. **Ease of Generation**: Programmatic map generation is simpler with string format
4. **Backward Compatibility**: Existing maps continue to work without modification
5. **Flexibility**: Choose the format that best suits your needs
6. **Automatic**: Compression is applied automatically, no client changes needed

## Technical Details

### LZW Algorithm

The LZW implementation uses:
- **Dictionary start code**: 57344 (matching client)
- **Literal codes**: 0-57343 (direct character codes)
- **Dictionary codes**: 57344+ (compressed sequences)

### Performance Impact

- **Compression time**: Negligible (<1ms for typical viewports)
- **Bandwidth savings**: 85-95% reduction
- **Client decompression**: Fast (built into client)

### Example Compression

Before compression (2183 chars):
```
209:209:209:209:209:209:209:209:209:209:209:209:209:209:209:209:...
```

After compression (147 chars):
```
[Binary LZW compressed data - not human readable]
```

Client receives compressed data and calls `jv.unzip()` to restore original.

## Migration

No migration needed! Existing maps with 2D array format continue to work. You can:

- Keep using 2D arrays for new maps
- Use colon format for new maps
- Mix formats across different maps in your project
