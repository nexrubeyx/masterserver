# Remove Packet Elimination - Implementation Summary

## Problem Statement

The server was sending `{ type: "remove", id: <sessionId> }` packets to clients when a player disconnected. However, the desired behavior is to rely exclusively on the "pl" (players list) sweep mechanism for removing disconnected players, matching the original server behavior.

**Previous Behavior:**
- Server sends explicit "remove" packet when a player disconnects
- Client immediately removes the player entity upon receiving "remove" packet
- This creates a dual-path removal system (explicit "remove" + "pl" sweep)

**Desired Behavior:**
- Server does NOT send "remove" packets
- Client relies only on the "pl" sweep mechanism:
  1. Server sends "pl" packet with list of active players
  2. Client marks all entities as `updated=0`
  3. Client marks entities in the "pl" list as `updated=1`
  4. Client removes all entities still marked as `updated=0`

## Context

The client (ml.min.js) has a packet parser that handles various message types:
- "zip": Compressed data
- "pkg": Package of messages
- "message": Chat messages
- "fx_tpl": Effect templates
- "fx": Play effects
- "obj": Object updates
- "pl": Players list (triggers sweep)
- "remove": Explicit removal (NOW DEPRECATED)

This change eliminates the server-side generation of "remove" packets, simplifying the removal flow to use only the "pl" sweep mechanism.

## Solution

### Files Changed

#### src/state/world.js
Modified the `handleDisconnect` method to remove the broadcast of "remove" packets:

**Before (lines 274-280):**
```javascript
// 2) Notifica outros no mesmo mapa que este player saiu
// O cliente ml.min.js espera { type: "remove", id: <id> }
try {
  this.sendToOthersInMap(player, { type: 'remove', id: String(player.sessionId) });
} catch (err) {
  this.logger?.warn({ err: err?.message, stack: err?.stack, sessionId: player?.sessionId }, 'Falha ao broadcast remove');
}
```

**After (lines 274-279):**
```javascript
// 2) NÃO envia evento "remove" - o cliente agora depende exclusivamente do sweep da lista "pl"
// para remover jogadores que desconectaram. Isso corresponde ao comportamento do servidor original.
// Quando o próximo pacote "pl" for enviado aos outros jogadores, este jogador não estará incluído,
// fazendo com que o cliente o remova automaticamente durante o sweep.
```

#### test-ghost-player-fix.js
Updated the test to verify that "remove" packets are NO LONGER sent:

**Changes:**
1. **Lines 144-156**: Modified to verify that NO "remove" events are received
   ```javascript
   // Before: Expected removeMessages.length > 0
   // After: Expected removeMessages.length === 0
   ```

2. **Lines 195-199**: Updated success messages to reflect new behavior
   ```javascript
   console.log('✓ Evento de remoção NÃO é mais enviado (comportamento correto)');
   console.log('✓ Cliente removerá jogadores através do sweep do pacote "pl"');
   ```

## Testing

Run the test with:
```bash
node test-ghost-player-fix.js
```

**Expected Output:**
```
=== Teste de Correção de Ghost Players ===

✓ World inicializado
✓ WebSockets criados
✓ Jogador 1 anexado
✓ Jogador 2 anexado
✓ Ambos os jogadores estão no mundo
✓ Ambos os jogadores estão no mapa 'test2'
✓ handleDisconnect chamado
✓ Jogador 1 foi removido do mapa de sessões
✓ Jogador 1 foi removido da lista de jogadores no mapa
✓ Jogador 2 NÃO recebeu evento de remoção (comportamento esperado)
✓ Jogador 2 ainda está conectado
✓ handleDisconnect é idempotente - não enviou mensagens extras
✓ World finalizado

=== TODOS OS TESTES PASSARAM ===

✓ Ghost players são corretamente removidos das estruturas quando jogadores desconectam
✓ Evento de remoção NÃO é mais enviado (comportamento correto)
✓ Cliente removerá jogadores através do sweep do pacote "pl"
✓ handleDisconnect é idempotente
```

## Verification

- **Code Review**: ✓ Changes are minimal and focused
- **Security Scan**: To be performed
- **Automated Tests**: ✓ All tests pass

## Impact

This change achieves the following requirements:

1. ✅ **Eliminates "remove" packet generation**
   - Server no longer sends `{ type: "remove", id: ... }` packets
   - Simplifies the removal flow to a single path

2. ✅ **Client relies on "pl" sweep only**
   - Players are removed when omitted from the "pl" packet
   - Matches the original server behavior
   - More consistent with how the game handles player presence

3. ✅ **Existing flows continue to work**
   - Message shows "has left" text (handled separately)
   - fx_tpl registers effect templates (unchanged)
   - fx plays effect like "poofed" (unchanged)
   - pl performs sweep to remove missing players (primary mechanism)

## Technical Details

### How Player Removal Now Works

1. **Player Disconnects**:
   - `handleDisconnect()` is called
   - Player is removed from `sessions` Map
   - Player is removed from `players` Map
   - Player state is saved to database (async)
   - **NO "remove" packet is sent**

2. **Other Players Receive "pl" Update**:
   - During the next game loop tick, the server sends "pl" packets
   - The "pl" packet contains only currently connected players
   - The disconnected player is NOT included in the list

3. **Client Performs Sweep**:
   - Client marks all entities as `updated=0`
   - Client marks entities in "pl" list as `updated=1`
   - Client removes all entities still marked as `updated=0`
   - The disconnected player entity is removed during this sweep

### Benefits of This Approach

1. **Simpler Logic**: Single removal path instead of dual paths
2. **Matches Original**: Aligns with original server behavior
3. **More Reliable**: Less room for race conditions or missed removals
4. **Cleaner Code**: Removes exception handling for "remove" broadcasts

### Timing Considerations

- Player removal is no longer instantaneous
- Players will be removed on the next "pl" update (typically within one game tick)
- This is acceptable as it matches the original server behavior
- The delay is negligible (typically 50ms or less)

## Migration Notes

No migration is needed. This is a behavioral change that:
- Simplifies the server-side removal logic
- Relies on existing client-side "pl" sweep mechanism
- Does not change any data models
- Does not require database migrations
- Is compatible with existing clients that support "pl" sweep

## Backward Compatibility

**Important Note**: This change assumes that the client (ml.min.js) properly implements the "pl" sweep mechanism. If an older client version relies solely on "remove" packets, it will not properly remove disconnected players.

To verify client compatibility:
1. Ensure the client has a "pl" packet handler
2. Verify the handler marks entities as `updated=0/1`
3. Confirm the handler removes entities with `updated=0`

If the client does not support "pl" sweep, the client code must be updated first before deploying this server change.

## Related Changes

This change supersedes the previous "Ghost Player Fix" which corrected the field name in the "remove" packet. Since "remove" packets are no longer sent, that fix is now moot, but the structural improvements to `handleDisconnect()` remain valuable.

See also:
- `GHOST_PLAYER_FIX_SUMMARY.md` - Previous fix for "remove" packet field name
