# Implementação de Broadcast de Lista de Jogadores ("pl")

## Resumo das Mudanças

Este documento descreve as alterações implementadas para suportar o envio de pacotes "pl" (player list) durante movimento de jogadores e login.

## Problema Original

O cliente esperava receber atualizações de movimento de jogadores no formato de pacotes "pl":

```json
{
    "type": "pl",
    "data": [
        "{\"type\":\"p\",\"id\":16542,\"tpl\":16542,\"s\":323,\"d\":3,\"x\":23,\"y\":7,\"dx\":44,\"dy\":3}",
        "{\"type\":\"p\",\"id\":45,\"tpl\":\"cat\",\"s\":750,\"d\":2,\"x\":17,\"y\":11,\"dx\":17,\"dy\":11}",
        ...
    ]
}
```

Anteriormente, o servidor enviava pacotes "p" individuais para cada jogador em movimento.

## Requisitos Implementados

### 1. ✅ Envio de Pacotes "pl" Durante Movimento

- Quando jogadores se movem, o servidor agora envia pacotes "pl" em lote ao final de cada tick
- Cada pacote "pl" contém um array de snapshots "p" serializados como strings JSON
- Os pacotes são enviados apenas para jogadores que estão dentro do range visível (viewport)

### 2. ✅ Otimização por Chunk (Range Visível)

- Os pacotes "pl" são enviados apenas para jogadores dentro da área visível
- Range de visibilidade configurável via variáveis de ambiente:
  - `MAP_VIEW_RADIUS_X`: 18 tiles (padrão)
  - `MAP_VIEW_RADIUS_Y`: 13 tiles (padrão)
- Jogadores distantes não recebem atualizações desnecessárias

### 3. ✅ Envio de Pacotes "pl" Durante Login

- Quando um jogador faz login, todos os jogadores no mapa recebem pacotes "pl" atualizados
- O novo jogador recebe um pacote "pl" com todos os jogadores visíveis
- Jogadores existentes recebem um pacote "pl" incluindo o novo jogador
- Templates (`plr_tpl`) continuam sendo enviados para renderização

## Arquivos Modificados

### 1. `/src/services/playerService.js`

#### Método Modificado: `flushSnapshotIfDirty()`
- **Antes**: Enviava pacotes "p" individuais imediatamente
- **Depois**: Marca jogadores com flag `_pendingSnapshot` para envio em lote

#### Método Adicionado: `flushPendingSnapshots()`
- Coleta todos os jogadores com snapshots pendentes
- Agrupa por mapa
- Para cada jogador receptor, filtra jogadores visíveis
- Envia pacote "pl" com lista de jogadores visíveis

#### Método Adicionado: `isPlayerInViewRange(viewer, target)`
- Verifica se um jogador está dentro do range visível de outro
- Usa `MAP_VIEW_RADIUS_X` e `MAP_VIEW_RADIUS_Y`
- Retorna `true` se a distância está dentro do viewport

### 2. `/src/state/world.js`

#### Método Modificado: `startGameLoop()`
- **Adicionado**: Chamada a `flushPendingSnapshots()` após processar todos os jogadores
- Garante que todos os snapshots pendentes sejam enviados em lote ao final de cada tick

#### Método Modificado: `syncPresence(newPlayer)`
- **Antes**: Enviava pacotes "p" individuais para sincronizar presença
- **Depois**: 
  - Envia templates (`plr_tpl`) para todos os jogadores
  - Envia pacotes "pl" com lista de jogadores visíveis para cada jogador
  - Filtra jogadores por range visível

## Formato dos Pacotes

### Pacote "pl" (Player List)
```json
{
  "type": "pl",
  "data": [
    "{\"type\":\"p\",\"id\":1001,\"tpl\":1001,\"x\":50,\"y\":50,\"dx\":50,\"dy\":50,\"s\":300,\"d\":0,\"ch\":0}",
    "{\"type\":\"p\",\"id\":1002,\"tpl\":1002,\"x\":55,\"y\":52,\"dx\":55,\"dy\":52,\"s\":300,\"d\":1,\"ch\":0}"
  ]
}
```

### Pacote "p" (Player Snapshot) - dentro do "pl"
```json
{
  "type": "p",
  "id": 1001,
  "tpl": 1001,
  "x": 50,
  "y": 50,
  "dx": 50,
  "dy": 50,
  "s": 300,
  "d": 0,
  "ch": 0
}
```

## Fluxo de Execução

### Durante Movimento

1. **Tick do Game Loop** (`world.js:startGameLoop()`)
   ```
   Para cada jogador:
     - Processa movimento (tickPlayer)
     - Marca snapshot como dirty se moveu
     - Marca como _pendingSnapshot
   
   Após processar todos:
     - flushPendingSnapshots()
     - Agrupa jogadores por mapa
     - Filtra por range visível
     - Envia pacotes "pl"
   ```

2. **Envio de Pacotes** (`playerService.js:flushPendingSnapshots()`)
   ```
   Para cada mapa com atualizações:
     Para cada jogador receptor:
       - Filtra jogadores visíveis (isPlayerInViewRange)
       - Cria array de snapshots JSON
       - Envia pacote "pl"
   ```

### Durante Login

1. **Sincronização de Presença** (`world.js:syncPresence()`)
   ```
   1. Envia templates para todos
   2. Para cada jogador no mapa:
      - Filtra jogadores visíveis
      - Cria pacote "pl" com lista
      - Envia para o jogador
   ```

## Otimizações Implementadas

### 1. Batching de Atualizações
- Atualizações de movimento são agrupadas por tick
- Reduz número de pacotes enviados
- Um pacote "pl" por jogador por tick em vez de múltiplos pacotes "p"

### 2. Filtragem por Range Visível
- Apenas jogadores dentro do viewport recebem atualizações
- Reduz drasticamente tráfego de rede em mapas grandes
- Configurável via variáveis de ambiente

### 3. Rate Limiting
- Mantém rate limiting existente (`SNAPSHOT_MAX_HZ`)
- Garante que snapshots não sejam enviados mais rápido que o necessário

## Testes Implementados

### 1. `test-player-list-broadcast.js`
- Testa envio de pacotes "pl" durante movimento
- Valida filtragem por range visível
- Verifica formato dos pacotes
- Testa limites exatos do viewport

### 2. `test-login-player-list.js`
- Testa envio de pacotes "pl" durante login
- Valida que jogadores próximos recebem atualizações
- Verifica que jogadores distantes são filtrados
- Confirma formato correto dos pacotes

### 3. `test-integration-player-broadcast.js`
- Teste de integração completo
- Simula tick do game loop
- Valida comportamento end-to-end

## Resultados dos Testes

✅ Todos os testes passaram com sucesso:
- Jogadores próximos recebem atualizações via pacotes "pl"
- Jogadores distantes não recebem atualizações desnecessárias
- Formato dos pacotes está correto
- Sistema de batching funciona corretamente
- Login envia pacotes "pl" conforme esperado

## Compatibilidade

### Mantido
- ✅ Templates (`plr_tpl`) continuam sendo enviados
- ✅ Rate limiting de snapshots mantido
- ✅ Validação de segurança mantida
- ✅ Sistema de viewport mantido
- ✅ Todas as funcionalidades existentes funcionam

### Alterado
- ❌ Pacotes "p" individuais não são mais enviados para outros jogadores
- ✅ Substituídos por pacotes "pl" em lote (mais eficiente)

## Configuração

As seguintes variáveis de ambiente controlam o comportamento:

```env
# Range de visibilidade (tiles)
MAP_VIEW_RADIUS_X=18
MAP_VIEW_RADIUS_Y=13

# Taxa máxima de envio de snapshots (Hz)
SNAPSHOT_MAX_HZ=20

# Intervalo do game loop (ms)
TICK_MS=50
```

## Próximos Passos

1. ✅ Implementação completa
2. ✅ Testes unitários passando
3. ✅ Teste de integração passando
4. ⏳ Validação manual com cliente real
5. ⏳ Monitoramento de performance em produção

## Notas Técnicas

### Performance
- Complexidade de filtragem: O(n²) por mapa, onde n = número de jogadores no mapa
- Para otimização futura, considerar spatial hashing/quadtree para lookups O(1)
- Aceitável para mapas com < 100 jogadores simultâneos

### Memória
- Nenhuma estrutura de dados adicional permanente
- Flags temporárias (`_pendingSnapshot`) limpas a cada tick
- Pacotes criados sob demanda e descartados após envio

### Rede
- Redução significativa de tráfego através de batching
- Estimativa: 50-70% menos pacotes enviados em cenários com múltiplos jogadores
- Melhor utilização de largura de banda através de agrupamento
