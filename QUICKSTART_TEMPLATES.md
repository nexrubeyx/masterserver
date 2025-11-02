# Quick Start Guide - Template & Object System

## What Was Implemented

This PR adds a complete template and object-based map system with automatic hot-reload functionality, providing a lightweight alternative to the full MongoDB server.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start        # Production mode
# OR
npm run dev      # Development mode with file watching
```

The server will start on port 8080 (configurable via `WS_PORT` env variable).

### 3. Connect a Client
Your WebSocket client will automatically receive:
- **On connection**: `obj_tpl` message with all templates
- **On connection**: `o` message with objects in viewport
- **On template change**: Updated `obj_tpl` message
- **On map change**: Updated `o` message for affected tiles

## Example WebSocket Messages

### Server → Client: Template Catalog
```json
{
  "type": "obj_tpl",
  "tpls": [
    {
      "tpl": "torch",
      "name": "Tocha",
      "desc": "Ilumina a área",
      "stack": false,
      "pickup": true,
      "block": false,
      "spr": 456,
      "build": "456f,t|ffaa00|,q|0.9|"
    }
  ]
}
```

### Server → Client: Objects on Map
```json
{
  "type": "o",
  "tiles": [
    { "x": 10, "y": 5, "d": "torch|chest" },
    { "x": 13, "y": 8, "d": "door_closed" }
  ]
}
```

### Client → Server: Build Object (Optional)
```json
{
  "type": "bld",
  "tpl": "torch",
  "x": 10,
  "y": 5
}
```
⚠️ Requires `ALLOW_CLIENT_BUILD=true` environment variable

## Directory Structure

```
masterserver/
├── config/
│   └── templates/          ← Add your template JSON files here
│       ├── torch.json
│       ├── chest.json
│       └── door_closed.json
├── maps/
│   └── mundo1.json         ← Map with objects
└── src/
    ├── index.js            ← New lightweight server entry point
    ├── templates/
    │   └── registry.js     ← Template management
    ├── maps/
    │   ├── loader.js       ← Map loading
    │   └── overlay.js      ← Object indexing
    └── protocol/
        └── send.js         ← Protocol helpers
```

## Hot-Reload in Action

### Adding a New Template
1. Create `config/templates/mysword.json`:
   ```json
   {
     "tpl": "sword",
     "name": "Espada",
     "desc": "Uma arma afiada",
     "stack": false,
     "pickup": true,
     "block": false,
     "spr": 999,
     "build": "999f"
   }
   ```
2. Server automatically loads it
3. All connected clients receive updated `obj_tpl`

### Modifying a Template
1. Edit `config/templates/torch.json`
2. Change any field (e.g., name, description)
3. Server automatically reloads
4. All connected clients receive updated `obj_tpl`

### Adding Objects to Map
1. Edit `maps/mundo1.json`
2. Add to `objects` array:
   ```json
   { "x": 7, "y": 7, "d": "sword|chest" }
   ```
3. Server automatically reloads
4. All connected clients receive updated `o` for affected tiles

## Environment Variables

Create a `.env` file or export these:

```bash
WS_PORT=8080                           # WebSocket port
MAP_FILE=maps/mundo1.json              # Map file path
TEMPLATES_DIR=config/templates         # Templates directory
INIT_VIEW_W=15                         # Initial viewport width
INIT_VIEW_H=15                         # Initial viewport height
ALLOW_CLIENT_BUILD=false               # Enable client building
```

## Testing Hot-Reload

Run the included test script:
```bash
node test-hot-reload.js
```

## Comparison: Simplified vs Full Server

| Feature | Simplified (npm start) | Full (npm run start:full) |
|---------|----------------------|---------------------------|
| MongoDB | ❌ Not required | ✅ Required |
| Authentication | ❌ None | ✅ Login/Guest |
| Templates | ✅ Hot-reload | ⚠️ Can be added |
| Objects | ✅ Hot-reload | ⚠️ Can be added |
| Persistence | ❌ In-memory | ✅ Database |
| Resource Usage | 🟢 Low | 🟡 Medium |
| Startup Time | 🟢 Fast (~2s) | 🟡 Slower (~5s) |
| Use Case | Development, Simple | Production, Full Game |

## Troubleshooting

### Server won't start (EADDRINUSE)
- Another process is using port 8080
- Solution: `export WS_PORT=8081` or kill the other process

### Hot-reload not working
- Check file permissions
- Ensure files are valid JSON
- Check server logs for errors
- Try manually restarting the server

### Client not receiving messages
- Verify client connects to `ws://localhost:8080`
- Check client is listening for `obj_tpl` and `o` message types
- Verify WebSocket connection is open

### Templates not loading
- Check JSON syntax with a validator
- Ensure `tpl` field is present in each template
- Check server logs for parsing errors

## Integration with Existing Client

Your client should:

1. **On WebSocket open**: Wait for initial messages
2. **On `obj_tpl` message**: Update template catalog
3. **On `o` message**: Place/update objects on tiles
4. **(Optional) Send `bld`**: If building is enabled

Example client code (JavaScript):
```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  
  if (msg.type === 'obj_tpl') {
    // Update template catalog
    templateCatalog = msg.tpls;
  }
  
  if (msg.type === 'o') {
    // Place objects on tiles
    msg.tiles.forEach(tile => {
      placeObjectsAt(tile.x, tile.y, tile.d.split('|'));
    });
  }
};

// Optional: Send build command
function buildObject(tpl, x, y) {
  ws.send(JSON.stringify({ type: 'bld', tpl, x, y }));
}
```

## Next Steps

1. ✅ Server is running and ready
2. 📝 Add your own templates to `config/templates/`
3. 📝 Create or modify maps in `maps/`
4. 🎮 Connect your client to `ws://localhost:8080`
5. 🧪 Test hot-reload by editing files while server runs

## Documentation

- **TEMPLATE_SYSTEM_IMPLEMENTATION.md** - Detailed technical documentation
- **README.md** - General server documentation
- **test-hot-reload.js** - Automated tests

## Support

If you encounter issues:
1. Check server logs for errors
2. Verify JSON syntax in template/map files
3. Ensure all environment variables are set correctly
4. Review TEMPLATE_SYSTEM_IMPLEMENTATION.md for details

---

**Ready to use!** 🚀
Start the server with `npm start` and begin developing with hot-reload enabled.
