# Arquivos Responsáveis pelo Movimento do Jogador

## Pergunta
**"Qual arquivo dentro do servidor/king realmnet cuida os movimentos do jogador?"**

## Resposta Rápida

O arquivo principal que cuida dos movimentos do jogador é:

**`src/services/playerService.js`**

Este arquivo contém toda a lógica de movimento, incluindo:
- Processamento tile-by-tile
- Validação de movimento
- Sincronização de posição entre jogadores
- Sistema de velocidade e aceleração

## Arquivos Relacionados ao Sistema de Movimento

### 1. **src/services/playerService.js** (PRINCIPAL)
**Responsabilidade**: Lógica central de movimento e estado do jogador

**Funções principais**:
- `startMoving(player, dir)` - Inicia movimento em uma direção
- `stopMoving(player, sendToSelf)` - Para o movimento do jogador
- `tickPlayer(player, dt)` - Atualiza posição do jogador a cada tick (50ms)
- `setHeading(player, dir)` - Muda direção sem mover
- `makePlayerSnapshotPacket(player)` - Cria pacote com posição atual
- `broadcastPlayerPositions(mapId, excludePlayer)` - Envia posições para outros jogadores
- `flushPendingSnapshots()` - Envia atualizações de posição em lote

**Principais características**:
```javascript
// Sistema de movimento tile-by-tile
// Baseado em velocidade (ms por tile)
// Usa acumulador de tempo + delta para movimento suave
tickPlayer(player, dt) {
  // Processa movimento
  player._accumMs += dt;
  if (player._accumMs >= player.speed) {
    // Move 1 tile
    player.x += dx;
    player.y += dy;
  }
}

// Inicia movimento e salva origem
startMoving(player, dir) {
  player._moveOriginX = player.x;  // dx (origem)
  player._moveOriginY = player.y;  // dy (origem)
  player.moving = true;
  player.dir = dir;
}

// Para movimento e limpa origem
stopMoving(player) {
  player.moving = false;
  player._moveOriginX = undefined;
  player._moveOriginY = undefined;
}
```

### 2. **src/controllers/messageRouter.js** (ROTEAMENTO)
**Responsabilidade**: Roteamento de comandos de movimento do cliente

**Comandos de movimento**:

#### Comando `m` - Mudança de direção (sem movimento)
```javascript
case 'm': {
  // Cliente muda direção mas não anda
  world.playerService.setHeading(session.player, packet.d);
}
```

#### Comando `h` - Iniciar/parar movimento
```javascript
case 'h': {
  // Se tem direção, inicia movimento
  if (Number.isInteger(packet.d)) {
    world.playerService.startMoving(session.player, packet.d);
  } else {
    // Se não tem direção, para movimento
    world.playerService.stopMoving(session.player, true);
  }
}
```

### 3. **src/services/securityService.js** (VALIDAÇÃO)
**Responsabilidade**: Validação de segurança para movimentos

**Funções de validação**:
- `validateMovement(player, nx, ny, dir)` - Valida se movimento é permitido
- `validateClientCoordinates(player, x, y)` - Valida coordenadas enviadas pelo cliente
- `validateChunkIntegrity(chunk)` - Valida integridade dos dados de chunk
- `shouldSendCorrection(player)` - Rate limiting de correções

**Proteções contra exploits**:
```javascript
// Previne teleportação - jogador deve seguir caminho A→B→C
validateMovement(player, nx, ny, dir) {
  // Verifica se movimento é sequencial (não pula tiles)
  // Valida limites do mapa
  // Detecta movimentos anômalos
}
```

### 4. **src/constants/tiles.js** (REGRAS DE TILES)
**Responsabilidade**: Define tiles andáveis e velocidades

**Funções**:
- `isWalkable(tile)` - Verifica se tile pode ser atravessado
- `isDeepWater(tile)` - Verifica se é água profunda (bloqueia)
- `getModifiedSpeed(baseSpeed, tile)` - Calcula velocidade modificada

**Exemplo de configuração**:
```javascript
// Tiles não-andáveis (bloqueiam movimento)
export const NON_WALKABLE_TILES = new Set([
  209,      // Montanha
  "209_3",  // Variante de montanha
  210,      // Muro
  // ...
]);

// Tiles de água profunda (bloqueiam sem canSwim)
export const DEEP_WATER_TILES = new Set([36, 248, 325]);

// Modificadores de velocidade
export const TILE_SPEED_MODIFIERS = {
  1: 0.5,    // Estrada (50% mais rápido = 0.5x tempo)
  100: 2.0,  // Lama (50% mais lento = 2.0x tempo)
};
```

### 5. **src/services/chunkValidationService.js** (VALIDAÇÃO DE CHUNKS)
**Responsabilidade**: Validação de chunks enviados ao cliente

**Funções**:
- `validateChunk(player, map, ox, oy, radiusX, radiusY, tiles)` - Valida chunk antes de enviar
- `validateChunkSize(tiles, radiusX, radiusY)` - Valida tamanho do chunk
- `validateChunkIntegrity(chunk)` - Valida integridade dos dados

## Fluxo Completo de Movimento

### 1. Cliente envia comando
```javascript
// Cliente pressiona tecla de movimento
{"type": "h", "x": 45, "y": 96, "d": 1}  // Direção 1 = direita
```

### 2. messageRouter.js recebe e roteia
```javascript
case 'h': {
  const session = world.getSession(ws);
  
  // Valida coordenadas
  const validation = world.securityService.validateClientCoordinates(
    session.player, packet.x, packet.y
  );
  
  if (validation.valid) {
    // Inicia movimento
    world.playerService.startMoving(session.player, packet.d);
  }
}
```

### 3. playerService.js processa movimento
```javascript
// startMoving() marca jogador como em movimento
startMoving(player, dir) {
  player._moveOriginX = player.x;  // Salva origem
  player._moveOriginY = player.y;
  player.moving = true;
  player.dir = dir;
  
  // Envia atualização imediata para todos
  this.broadcastPlayerPositions(player.mapId, null);
}
```

### 4. Game loop atualiza posição (a cada 50ms)
```javascript
// tickPlayer() chamado pelo game loop
tickPlayer(player, dt) {
  player._accumMs += dt;  // Acumula tempo
  
  if (player._accumMs >= player.speed) {
    // Calcula próxima posição
    const nx = player.x + dx;
    const ny = player.y + dy;
    
    // Valida movimento
    const validation = securityService.validateMovement(player, nx, ny, dir);
    
    if (validation.valid && isWalkable(tile) && !isDeepWater(tile)) {
      // Move jogador
      player.x = nx;
      player.y = ny;
      
      // Aplica modificador de velocidade do tile
      player.speed = getModifiedSpeed(player.baseSpeed, currentTile);
      
      // Envia atualização para todos
      this.broadcastPlayerPositions(player.mapId, null);
    } else {
      // Bloqueia movimento e retorna para posição válida
      this.stopMoving(player);
    }
  }
}
```

### 5. Broadcast de posição para outros jogadores
```javascript
// broadcastPlayerPositions() envia para todos no mapa
broadcastPlayerPositions(mapId, excludePlayer) {
  const players = this.world.getPlayersInMap(mapId);
  
  // Cria pacote "pl" (player list) com posições
  const plPacket = {
    type: 'pl',
    data: [
      '{"type":"p","id":123,"x":46,"y":96,"dx":45,"dy":96,"d":1,"s":300}',
      // ... outros jogadores
    ]
  };
  
  // Envia para todos os jogadores visíveis
  for (const receiver of players) {
    if (receiver !== excludePlayer) {
      this.world.sendTo(receiver, plPacket);
    }
  }
}
```

## Formato de Pacotes de Movimento

### Pacote de Snapshot do Jogador
```javascript
{
  type: 'p',            // Player position
  id: 123,              // Session ID
  tpl: 123,             // Template ID
  x: 46,                // Posição atual X
  y: 96,                // Posição atual Y
  dx: 45,               // Origem X (onde movimento começou)
  dy: 96,               // Origem Y (onde movimento começou)
  s: 300,               // Velocidade (ms/tile)
  d: 1,                 // Direção (0=cima, 1=direita, 2=baixo, 3=esquerda)
  ch: 0                 // Channel (sempre 0)
}
```

### Formato de Envio (PKG > PL > P)
```javascript
{
  type: 'pkg',
  data: '[{"type":"pl","data":["{\\"type\\":\\"p\\",\\"id\\":123,...}"]}]'
}
```

## Características do Sistema de Movimento

### 1. **Tile-by-Tile**
- Jogador se move 1 tile por vez
- Baseado em velocidade configurável (padrão: 300ms/tile)
- Usa acumulador de tempo para movimento suave

### 2. **Strict Server Authority**
- Servidor tem autoridade total sobre posições
- Validação de segurança em todos os movimentos
- Correção automática de dessincronia

### 3. **Validação de Tiles**
- Tiles não-andáveis bloqueiam movimento (ex: montanhas, muros)
- Água profunda bloqueia movimento (a menos que canSwim=true)
- Modificadores de velocidade (estradas, lama, etc)

### 4. **Sincronização em Tempo Real**
- Atualização enviada para cada tile percorrido
- Formato "pl" (player list) com todos jogadores visíveis
- Cache de pacotes para otimização

### 5. **Origem de Movimento (dx/dy)**
- dx/dy representam onde o movimento COMEÇOU (não o destino)
- Permanecem constantes durante toda a sessão de movimento
- Resetam quando jogador para

## Sistema de Coordenadas

### Direções
```
0 = Cima (North)    - Y diminui
1 = Direita (East)  - X aumenta
2 = Baixo (South)   - Y aumenta
3 = Esquerda (West) - X diminui
```

### Exemplo de Movimento
```
Jogador em (10, 10) move para direita (d=1):
- Tick 1: x=11, y=10, dx=10, dy=10 (origem)
- Tick 2: x=12, y=10, dx=10, dy=10 (origem permanece)
- Tick 3: x=13, y=10, dx=10, dy=10 (origem permanece)

Jogador para:
- Stop: x=13, y=10, dx=13, dy=13 (origem reseta)
```

## Documentação Adicional

Para mais detalhes, consulte:
- `ORIGINAL_SERVER_MOVEMENT_IMPLEMENTATION.md` - Comportamento do servidor original
- `POSITION_SYNC_IMPLEMENTATION.md` - Sistema de sincronização de posições
- `TILE_VALIDATION_SPEED_SYSTEM.md` - Sistema de validação de tiles
- `SECURITY_DOCUMENTATION.md` - Sistema de segurança e validação

## Resumo

**Arquivo principal**: `src/services/playerService.js`

Este arquivo contém toda a lógica de:
- ✅ Iniciar/parar movimento
- ✅ Processar movimento tile-by-tile
- ✅ Validar tiles (andáveis, água profunda)
- ✅ Aplicar modificadores de velocidade
- ✅ Sincronizar posições entre jogadores
- ✅ Gerenciar origem de movimento (dx/dy)
- ✅ Enviar atualizações de rede

**Arquivo de roteamento**: `src/controllers/messageRouter.js`
- Recebe comandos 'm' e 'h' do cliente
- Valida coordenadas
- Chama funções do playerService

**Arquivos de suporte**:
- `src/services/securityService.js` - Validação de segurança
- `src/constants/tiles.js` - Regras de tiles
- `src/services/chunkValidationService.js` - Validação de chunks
