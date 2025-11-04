# Separação da Lógica de Sprite e Desabilitação da Reconciliação

## Resumo das Mudanças

Este documento descreve as alterações implementadas para separar a lógica de troca de sprite da lógica de costumes e desabilitar o sistema de reconciliação periódica.

## Problema Original

1. **Cliente enviando formato diferente**: O cliente envia `{"type":"c","r":"ap","c":1,"b":1,"h":1,"cc":14540253,"hc":6504471,"ec":255,"nc":15724527}` para trocar a aparência do sprite
2. **Validação de cores desnecessária**: Não era necessário validar as cores dos sprites
3. **Reconciliação indesejada**: O servidor estava enviando mensagens de "Reconciliação" periodicamente

## Solução Implementada

### 1. Novo Tipo de Mensagem 'c' (Sprite Change)

**Arquivo**: `src/protocol/schema.js`

Adicionado novo schema para mensagens do tipo 'c':

```javascript
c: {
  type: 'object',
  required: ['type', 'r'],
  properties: {
    type: { const: 'c' },
    r: { type: 'string', maxLength: 10 },
    c: { type: 'integer', minimum: 0, maximum: 100 },      // clothes
    b: { type: 'integer', minimum: 0, maximum: 100 },      // body
    h: { type: 'integer', minimum: 0, maximum: 100 },      // hair
    cc: { type: 'integer', minimum: 0, maximum: 16777215 }, // clothes_color
    hc: { type: 'integer', minimum: 0, maximum: 16777215 }, // hair_color
    ec: { type: 'integer', minimum: 0, maximum: 16777215 }, // eye_color
    nc: { type: 'integer', minimum: 0, maximum: 16777215 }  // name_color
  },
  additionalProperties: false
}
```

**Características**:
- Aceita qualquer valor RGB válido (0-16777215) para cores
- Não valida se as cores estão na lista FREE_COLORS ou PREMIUM_COLORS
- Valida apenas os limites numéricos

### 2. Handler para Mensagens 'c'

**Arquivo**: `src/controllers/messageRouter.js`

Adicionado novo case handler:

```javascript
case 'c': {
  // Valida apenas body, hair e clothes
  const changes = {};
  if (typeof packet.b === 'number') changes.body = packet.b;
  if (typeof packet.h === 'number') changes.hair = packet.h;
  if (typeof packet.c === 'number') changes.clothes = packet.c;
  
  // Valida com validateAppearanceChanges (apenas body/hair/clothes)
  const validation = validateAppearanceChanges(changes, isPremium);
  
  // Atualiza cores DIRETAMENTE sem validação
  if (typeof packet.cc === 'number') {
    player.appearance.clothesColor = packet.cc;
  }
  // ... outras cores ...
}
```

**Características**:
- Valida apenas body, hair e clothes (usando sistema existente)
- Aceita cores sem validação
- Retorna resposta no formato `{"type":"c","r":"ap",...}`
- Atualiza template para todos os jogadores no mapa

### 3. Sistema de Costumes Permanece Inalterado

**Arquivo**: `src/controllers/messageRouter.js`

O sistema de costumes (`case 'costume':`) **NÃO foi modificado**:
- Continua validando cores com `validateAppearanceChanges`
- Continua funcionando exatamente como antes
- Mantém toda a lógica de validação premium

### 4. Reconciliação Desabilitada

**Arquivo**: `src/state/world.js`

Removida a lógica de reconciliação periódica:

**ANTES**:
```javascript
// Timestamp da última reconciliação completa
this._lastReconciliationAt = Date.now();

// Intervalo de reconciliação completa (configurável, padrão 5 segundos)
const RECONCILIATION_INTERVAL_MS = Number(this.env.POSITION_RECONCILIATION_INTERVAL_MS || 5000);

// Dentro do setInterval:
if (now - this._lastReconciliationAt >= RECONCILIATION_INTERVAL_MS) {
  this._lastReconciliationAt = now;
  this._reconcileAllPlayerPositions();
}
```

**DEPOIS**:
```javascript
// RECONCILIAÇÃO DESABILITADA:
// A reconciliação periódica foi desabilitada conforme solicitado.
// Anteriormente, enviava broadcasts de todas as posições periodicamente.
```

**O que foi removido**:
- Tracking de `_lastReconciliationAt`
- Configuração `RECONCILIATION_INTERVAL_MS`
- Chamada para `_reconcileAllPlayerPositions()`
- Logs sobre reconciliação

**Função `_reconcileAllPlayerPositions()`**:
- Ainda existe no código (não foi removida)
- Não é mais chamada automaticamente
- Pode ser chamada manualmente se necessário no futuro

## Fluxo de Mensagens

### Cliente → Servidor (Troca de Sprite)

```json
{
  "type": "c",
  "r": "ap",
  "c": 1,
  "b": 1,
  "h": 1,
  "cc": 14540253,
  "hc": 6504471,
  "ec": 255,
  "nc": 15724527
}
```

### Servidor → Cliente (Confirmação)

```json
{
  "type": "c",
  "r": "ap",
  "c": 1,
  "b": 1,
  "h": 1,
  "cc": 14540253,
  "hc": 6504471,
  "ec": 9682175,
  "nc": 16777215
}
```

### Servidor → Todos no Mapa (Atualização de Template)

```json
{
  "type": "plr_tpl",
  "sid": "1000",
  "body": 1,
  "hair": 1,
  "clothes": 1,
  "hairColor": 6504471,
  "clothesColor": 14540253,
  "eyeColor": 255,
  "nameColor": 15724527
}
```

## Validações

### O que É Validado
- ✅ Body (1-10 free, 11-20 premium)
- ✅ Hair (1-25 free, 26-40 premium)
- ✅ Clothes (1-20 free, 21-40 premium)
- ✅ Premium status do jogador

### O que NÃO É Validado
- ❌ Cores de cabelo (hc)
- ❌ Cores de roupa (cc)
- ❌ Cores de olhos (ec)
- ❌ Cores de nome (nc)

## Testes

Execute o teste de validação:

```bash
node test-sprite-change.js
```

Saída esperada:
```
✅ Schema válido: true
✅ Validação sem cores: true
✅ Bloqueado corretamente: true
✅ Aceito: true
✅ Costume separado: true
```

## Compatibilidade

### Sistema de Costumes
- ✅ Continua funcionando normalmente
- ✅ Ainda valida todas as cores
- ✅ Mantém lógica premium intacta

### Sistema de Sprites
- ✅ Novo sistema separado
- ✅ Não valida cores
- ✅ Valida apenas body/hair/clothes

### Reconciliação
- ❌ Desabilitada permanentemente
- ℹ️ Função ainda existe no código
- ℹ️ Pode ser reabilitada se necessário

## Impacto

### Positivo
- ✅ Cliente pode enviar qualquer cor RGB
- ✅ Menos validação = mais rápido
- ✅ Menos tráfego de rede (sem reconciliação)
- ✅ Lógica mais clara e separada

### Considerações
- ⚠️ Jogadores podem usar cores não previstas
- ⚠️ Sincronização de posição depende apenas de snapshots individuais
- ℹ️ Costume system ainda disponível para uso futuro

## Configuração

Não há configurações necessárias. As mudanças são automáticas e transparentes.

### Variáveis de Ambiente (Não Usadas)
- `POSITION_RECONCILIATION_INTERVAL_MS` - Não tem mais efeito

## Arquivos Modificados

1. `src/protocol/schema.js` - Adicionado schema para 'c'
2. `src/controllers/messageRouter.js` - Adicionado handler para 'c'
3. `src/state/world.js` - Desabilitada reconciliação periódica
4. `test-sprite-change.js` - Criado teste de validação

## Arquivos NÃO Modificados

- ✅ `src/constants/appearance.js` - Sistema de validação intacto
- ✅ `src/services/playerService.js` - Lógica de player não alterada
- ✅ Sistema de costume - Permanece funcional

## Conclusão

A separação da lógica de sprite está completa e testada. O sistema agora aceita o formato de mensagem esperado pelo cliente (`type:"c"` com `r:"ap"`) e não valida cores, enquanto o sistema de costumes permanece intacto para uso futuro. A reconciliação periódica foi desabilitada conforme solicitado.
