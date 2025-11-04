# Template Lookup Fix - Resolução do Erro "Cannot read properties of undefined"

## Problema Original

O cliente apresentava o seguinte erro ao tentar criar objetos:

```
Uncaught TypeError: Cannot read properties of undefined (reading 'name')
    at parse (ml.min.js?ver=5.0.9:1:105623)
    at connection.onmessage (ml.min.js?ver=5.0.9:1:121052)
```

### Causa Raiz

O erro ocorria devido a uma incompatibilidade de tipos entre IDs de templates:

1. **Templates definidos com IDs numéricos**: No arquivo `src/models/objectTemplates.js`, templates são definidos com `tpl: 1, 2, 3, ...` (números)
2. **Lookup com comparação estrita**: A função `findTemplate()` usava `===` (igualdade estrita)
3. **IDs enviados como strings**: Em alguns casos, IDs de templates eram enviados como strings (`'1'` em vez de `1`)
4. **Falha no lookup**: `findTemplate('1')` não encontrava template com `tpl: 1` devido à comparação estrita
5. **Objeto undefined**: Cliente recebia referência a template inexistente
6. **Erro ao acessar .name**: Cliente tentava acessar `undefined.name`, causando o erro

### Exemplo do Problema

```javascript
// Antes da correção
findTemplate(1)    // ✓ Encontra: {tpl: 1, name: 'Dirt', ...}
findTemplate('1')  // ✗ Retorna undefined (comparação estrita 1 !== '1')
```

## Solução Implementada

### 1. Modificação em `src/services/templateService.js`

Alterado o método de comparação de strict equality (`===`) para loose equality (`==`):

```javascript
// Antes
export function findTemplate(tpl) {
  const allTemplates = getAllTemplates();
  return allTemplates.find(t => t.tpl === tpl);
}

// Depois
export function findTemplate(tpl) {
  const allTemplates = getAllTemplates();
  // Usa loose equality (==) para comparar, permitindo "1" == 1
  return allTemplates.find(t => t.tpl == tpl);
}
```

**Benefícios:**
- Aceita tanto IDs numéricos quanto strings
- Mantém compatibilidade com código existente
- Resolve conversões implícitas de tipo

### 2. Validação em `src/services/mapObjectsLoader.js`

Adicionada validação antes de enviar object placements ao cliente:

```javascript
// Valida que o template existe antes de enviar
const template = findTemplate(p.tpl);
if (!template) {
  world.logger?.warn(
    { mapId: map.id, tpl: p.tpl, x: p.x, y: p.y },
    'objectPlacement referencia template inexistente - ignorando'
  );
  continue;
}
```

**Benefícios:**
- Previne envio de referências inválidas
- Loga avisos quando templates não existem
- Impede erro no cliente antes que aconteça

## Resultado

### Antes da Correção
```javascript
// Cliente recebia objeto placement com tpl inexistente
{ type: 'o', x: 10, y: 15, d: '99' }  // Template 99 não existe
// Cliente tentava acessar object_dict['99'].name → undefined.name → ERRO
```

### Depois da Correção
```javascript
// 1. findTemplate agora encontra templates independente do tipo
findTemplate(1)   // ✓ Encontra
findTemplate('1') // ✓ Encontra (mesmo objeto)

// 2. Placements inválidos são filtrados no servidor
// Template 99 não existe → não envia ao cliente → sem erro
```

## Testes

Execute o teste de validação:

```bash
node test-template-lookup.js
```

O teste valida:
- ✓ Lookup por número funciona
- ✓ Lookup por string funciona
- ✓ Ambos retornam o mesmo objeto
- ✓ Templates inexistentes retornam undefined
- ✓ Todos os templates são encontráveis por ambos os métodos

## Impacto

### Arquivos Modificados
1. `src/services/templateService.js` - Função `findTemplate()`
2. `src/services/mapObjectsLoader.js` - Validação em `sendMapObjectPlacementsToPlayer()`

### Compatibilidade
- ✓ **Totalmente retrocompatível**: código existente que passa números continua funcionando
- ✓ **Sem breaking changes**: nenhuma API pública foi modificada
- ✓ **Comportamento melhorado**: agora aceita mais formatos de entrada

### Segurança
- ✓ **Validação adicionada**: previne envio de dados inválidos
- ✓ **Logs adicionados**: facilita debugging de problemas de configuração
- ✓ **Graceful degradation**: ignora placements inválidos em vez de crashar

## Prevenção de Regressão

Para evitar que o problema volte:

1. **Use o tipo correto**: Prefira IDs numéricos em objectPlacements quando templates são numéricos
2. **Valide templates**: Sempre use `findTemplate()` antes de referenciar templates
3. **Execute testes**: `test-template-lookup.js` detecta problemas de lookup
4. **Consulte logs**: Avisos indicam quando templates não são encontrados

## Referências

- Issue original: "por que o client da esse erro... Cannot read properties of undefined (reading 'name')"
- Arquivos relacionados:
  - `src/models/objectTemplates.js` - Definições de templates
  - `src/services/templateService.js` - Sistema de templates
  - `src/services/mapObjectsLoader.js` - Carregamento de objetos do mapa
  - `src/utils/animatedObjects.js` - Utilitários para objetos
