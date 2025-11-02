# Sistema de Templates de Objetos

## Visão Geral

O sistema de templates de objetos permite definir objetos que podem ser colocados no mapa do jogo. Os templates podem ser definidos de duas formas:

1. **Templates Estáticos** - Definidos em `src/models/objectTemplates.js` (para templates globais)
2. **Templates de Mapa** - Definidos nos arquivos JSON de mapa em `src/maps/worlds/*.json` (específicos do mapa)

Além de definir templates, você também pode **colocar instâncias desses templates em coordenadas específicas do mapa** usando o array `objectPlacements`.

## Funcionalidades Implementadas

### 1. Envio de Templates Após Login

Quando um jogador faz login com sucesso, o servidor automaticamente envia todos os templates disponíveis para o cliente. Isso acontece na sequência de inicialização do cliente, garantindo que o cliente tenha o dicionário completo de objetos antes de receber qualquer objeto no mapa.

**Localização:** `src/controllers/messageRouter.js` - Caso 'login'/'guest'

```javascript
// 2) Envia todos os templates de objetos
// Isso garante que o cliente tenha o dicionário de objetos disponível
sendAllTemplates(ws);
```

### 2. Templates em Arquivos de Mapa

Os mapas agora podem definir seus próprios templates diretamente no arquivo JSON, assim como definem tiles. Isso permite que cada mapa tenha objetos específicos sem poluir o registro global de templates.

**Formato do Arquivo de Mapa:**

```json
{
  "id": "caverealm",
  "version": 19,
  "title": "Custom Map",
  "width": 15,
  "height": 15,
  "templates": [
    {
      "tpl": "torch_wall",
      "name": "Tocha de Parede",
      "desc": "Uma tocha iluminando a parede.",
      "stack": 0,
      "pickup": 1,
      "block": 0,
      "spr": 650,
      "build": "650f,a"
    }
  ],
  "objectPlacements": [
    {
      "tpl": "torch_wall",
      "x": 5,
      "y": 8
    },
    {
      "tpl": "torch_wall",
      "x": 10,
      "y": 8
    }
  ],
  "tiles": [
    [325, 325, 325, ...],
    ...
  ]
}
```

### 3. Colocação de Objetos no Mapa (objectPlacements)

**NOVO:** Agora você pode colocar objetos template em coordenadas específicas do mapa usando o array `objectPlacements`. Isso permite popular o mapa com objetos estáticos (árvores, barris, tochas, baús, etc.) sem precisar construí-los manualmente no jogo.

**Como Funciona:**

1. Defina os templates no array `templates` do mapa
2. Adicione um array `objectPlacements` com as posições onde deseja colocar cada objeto
3. Quando um jogador entra no mapa, todos os objetos são automaticamente colocados

**Formato de objectPlacements:**

```json
{
  "objectPlacements": [
    {
      "tpl": "tree_oak",      // ID do template (deve existir em templates)
      "x": 5,                 // Coordenada X no mapa
      "y": 8                  // Coordenada Y no mapa
    }
  ]
}
```

**Exemplo Completo:**

```json
{
  "id": "caverealm",
  "version": 19,
  "templates": [
    {
      "tpl": "tree_oak",
      "name": "Árvore de Carvalho",
      "desc": "Uma árvore grande.",
      "stack": 0,
      "pickup": 0,
      "block": 1,
      "spr": 720,
      "build": "-305, o|-20| -289f"
    },
    {
      "tpl": "barrel_small",
      "name": "Barril Pequeno",
      "desc": "Um pequeno barril.",
      "stack": 0,
      "pickup": 0,
      "block": 0,
      "spr": 812,
      "build": "812"
    }
  ],
  "objectPlacements": [
    { "tpl": "tree_oak", "x": 3, "y": 3 },
    { "tpl": "tree_oak", "x": 11, "y": 3 },
    { "tpl": "barrel_small", "x": 5, "y": 7 },
    { "tpl": "barrel_small", "x": 9, "y": 7 }
  ]
}
```

**Importante:**
- Os templates referenciados em `objectPlacements` devem estar definidos em `templates` ou em `src/models/objectTemplates.js`
- As coordenadas x,y devem estar dentro dos limites do mapa (0 a width-1, 0 a height-1)
- Múltiplos objetos podem ser colocados na mesma coordenada (empilhados)
- **Sempre incremente a versão do mapa** ao adicionar ou modificar objectPlacements

### 4. Estrutura de um Template

Cada template deve ter os seguintes campos:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `tpl` | string | ID único do template |
| `name` | string | Nome exibido do objeto |
| `desc` | string | Descrição do objeto |
| `stack` | number | Se o objeto pode ser empilhado (0 ou 1) |
| `pickup` | number | Se o objeto pode ser coletado (0 ou 1) |
| `block` | number | Se o objeto bloqueia passagem (0 ou 1) |
| `spr` | number | ID do sprite no atlas item16 |
| `build` | string | String de construção visual (opcional) |

**String de Construção (`build`):**

A string de construção define como o objeto é renderizado no mapa. Suporta vários modificadores:

- **Negativos**: Usam atlas de tiles (tile16)
- **Positivos**: Usam atlas de itens (item16)
- **`f`**: Renderiza na frente do jogador (foreground)
- **`a`**: Objeto animado
- **`b`**: Bloqueia passagem
- **`o|N|`**: Offset vertical em pixels (ex: `o|-20|`)
- **`t|RRGGBB|`**: Tint de cor (ex: `t|FF0000|` para vermelho)
- **`q|alpha|`**: Opacidade (ex: `q|0.5|` para 50%)
- **`n/s/e/w`**: Offset por direção do tile

**Exemplos:**

```javascript
// Árvore grande com tronco e copa
"build": "-305, o|-20| -289f"

// Barril simples
"build": "812"

// Tocha animada na frente
"build": "650f,a"
```

## Arquitetura Técnica

### Serviço de Templates (`src/services/templateService.js`)

O serviço foi refatorado para suportar templates dinâmicos:

- **`registerTemplates(templates)`** - Registra templates adicionais de mapas
- **`getAllTemplates()`** - Retorna todos os templates (estáticos + dinâmicos)
- **`sendAllTemplates(ws)`** - Envia todos os templates para um cliente
- **`sendTemplate(ws, template)`** - Envia um template específico
- **`findTemplate(tpl)`** - Busca um template por ID

#### Regras de Duplicatas

- Templates definidos em `objectTemplates.js` têm prioridade
- Templates de mapa com mesmo ID que templates estáticos são ignorados
- Templates de mapa com IDs únicos são adicionados ao registro
- Se múltiplos mapas definem o mesmo template, o último carregado prevalece

### Serviço de Mapas (`src/services/mapService.js`)

O serviço de mapas foi atualizado para carregar templates:

```javascript
// Ao carregar um mapa
if (Array.isArray(finalMapData.templates) && finalMapData.templates.length > 0) {
  registerTemplates(finalMapData.templates);
  this.logger.debug(
    { id: finalMapData.id, templateCount: finalMapData.templates.length }, 
    'Templates do mapa registrados'
  );
}
```

## Fluxo de Carregamento

1. **Servidor Inicia**
   - MapService carrega todos os mapas de `src/maps/worlds/*.json`
   - Para cada mapa, se houver `templates`, eles são registrados via `registerTemplates()`
   - Templates estáticos de `objectTemplates.js` são carregados automaticamente

2. **Cliente Conecta**
   - Cliente envia mensagem 'client' com informações
   - Cliente envia 'login' ou 'guest' para autenticar

3. **Login Bem-Sucedido**
   - Servidor cria/carrega personagem
   - Servidor envia pacote 'accepted'
   - **Servidor envia TODOS os templates** via `sendAllTemplates(ws)`
   - Servidor envia template e snapshot do jogador
   - Servidor envia informações do mapa
   - Servidor envia viewport inicial
   - Cliente está pronto para receber objetos

## Exemplos de Uso

### Exemplo 1: Criar Novo Template Global

Adicione em `src/models/objectTemplates.js`:

```javascript
{
  tpl: "fountain",
  name: "Fonte",
  desc: "Uma bela fonte decorativa.",
  stack: 0,
  pickup: 0,
  block: 1,
  spr: 850,
  build: "850,a"  // Animada
}
```

### Exemplo 2: Criar Templates Específicos de Mapa

Adicione no arquivo JSON do mapa:

```json
{
  "id": "dungeon",
  "version": 2,
  "templates": [
    {
      "tpl": "dungeon_torch",
      "name": "Tocha de Masmorra",
      "desc": "Tocha que ilumina a escuridão.",
      "stack": 0,
      "pickup": 0,
      "block": 0,
      "spr": 651,
      "build": "651f,a,t|FF8800|"
    },
    {
      "tpl": "dungeon_chest",
      "name": "Baú de Tesouro",
      "desc": "Pode conter tesouros valiosos!",
      "stack": 0,
      "pickup": 0,
      "block": 1,
      "spr": 801,
      "build": "801"
    }
  ],
  ...
}
```

### Exemplo 3: Colocar Objetos no Mapa com objectPlacements

**NOVO:** Use objectPlacements para popular o mapa com objetos estáticos:

```json
{
  "id": "village",
  "version": 3,
  "width": 20,
  "height": 20,
  "templates": [
    {
      "tpl": "tree_oak",
      "name": "Árvore de Carvalho",
      "spr": 720,
      "block": 1,
      "build": "-305, o|-20| -289f"
    },
    {
      "tpl": "house",
      "name": "Casa",
      "spr": 850,
      "block": 1,
      "build": "850"
    }
  ],
  "objectPlacements": [
    { "tpl": "tree_oak", "x": 5, "y": 5 },
    { "tpl": "tree_oak", "x": 7, "y": 5 },
    { "tpl": "tree_oak", "x": 9, "y": 5 },
    { "tpl": "house", "x": 10, "y": 10 },
    { "tpl": "house", "x": 14, "y": 10 }
  ],
  "tiles": [...]
}
```

Quando um jogador entra neste mapa, verá automaticamente as 3 árvores e 2 casas nos locais especificados.

### Exemplo 4: Usar Templates com Protocolo de Objetos

Uma vez que os templates estão registrados e enviados ao cliente, você pode usá-los com o protocolo de objetos:

**Cliente envia:**
```json
{
  "type": "bld",
  "tpl": "torch_wall"
}
```

**Servidor responde para todos:**
```json
{
  "type": "o",
  "x": 10,
  "y": 15,
  "d": "torch_wall"
}
```

## Versionamento de Mapas

Quando você adiciona ou modifica templates em um mapa, **sempre incremente a versão** do mapa no JSON:

```json
{
  "id": "caverealm",
  "version": 18,  // Incrementado de 17 para 18
  "templates": [
    // Novos templates ou modificações
  ]
}
```

Isso garante que o MongoDB seja atualizado com a nova versão do mapa.

## Protocolo Cliente-Servidor

### Mensagem obj_tpl

Cada template é enviado como uma mensagem `obj_tpl`:

```json
{
  "type": "obj_tpl",
  "tpl": "torch_wall",
  "name": "Tocha de Parede",
  "desc": "Uma tocha iluminando a parede.",
  "stack": 0,
  "pickup": 1,
  "block": 0,
  "spr": 650,
  "build": "650f,a"
}
```

### Ordem de Envio no Login

1. `accepted` - Confirmação de login
2. **`obj_tpl` × N** - Todos os templates
3. `tpl` - Template do jogador
4. `s` - Snapshot do jogador
5. `mt` - Informações do mapa
6. `chunk` - Viewport inicial
7. `inv` - Inventário
8. `music` - Música do mapa
9. Sincronização de presença com outros jogadores

## Testes

Para testar o sistema de templates localmente:

```bash
# Criar arquivo de teste
node -e "
import { registerTemplates, getAllTemplates, findTemplate } from './src/services/templateService.js';
import fs from 'fs';

const mapData = JSON.parse(fs.readFileSync('src/maps/worlds/test2.json', 'utf8'));
console.log('Templates estáticos:', getAllTemplates().length);
registerTemplates(mapData.templates);
console.log('Templates após registro:', getAllTemplates().length);
console.log('Busca torch_wall:', findTemplate('torch_wall') ? 'Encontrado' : 'Não encontrado');
"
```

## Resolução de Problemas

### Templates não aparecem no cliente

1. Verifique se o template está sendo enviado:
   - Adicione log em `sendAllTemplates()` em `templateService.js`
   - Verifique console do servidor durante login

2. Verifique formato do template:
   - Todos os campos obrigatórios presentes?
   - `tpl` é string única?
   - `spr` é número válido?

3. Verifique JSON do mapa:
   - JSON é válido?
   - `templates` é array?
   - Versão do mapa foi incrementada?

### Templates duplicados

Se você vê templates duplicados:

1. Verifique se o mesmo `tpl` existe em múltiplos lugares
2. Templates estáticos em `objectTemplates.js` têm prioridade
3. Templates de mapa com mesmo ID são ignorados

### Template não encontrado ao construir

```javascript
// Servidor retorna null em findTemplate()
const tpl = findTemplate('meu_template');
if (!tpl) {
  // Template não foi registrado ou ID está errado
}
```

Verifique:
1. ID do template está correto (case-sensitive)
2. Mapa com o template foi carregado
3. Versão do mapa foi incrementada
4. Servidor foi reiniciado após mudanças

## Melhores Práticas

1. **Use templates globais** para objetos comuns a múltiplos mapas
2. **Use templates de mapa** para objetos específicos de um mapa
3. **Sempre incremente a versão** ao modificar templates de mapa
4. **Use IDs descritivos** (ex: `dungeon_torch` em vez de `torch1`)
5. **Documente builds complexos** com comentários no JSON
6. **Teste templates** antes de usar em produção
7. **Mantenha sprites consistentes** com os atlas do cliente

## Arquivos Modificados

- `src/controllers/messageRouter.js` - Adicionado envio de templates após login
- `src/services/templateService.js` - Refatorado para suportar templates dinâmicos
- `src/services/mapService.js` - Adicionado carregamento de templates de mapas
- `src/services/mapObjectsLoader.js` - Adicionado suporte para objectPlacements (objetos estáticos)
- `src/services/playerService.js` - Adicionado envio de objectPlacements ao jogador
- `src/maps/worlds/test2.json` - Exemplo com templates e objectPlacements incluídos

## Compatibilidade

- Node.js 22+
- MongoDB 6+
- Cliente ML compatível com protocolo `obj_tpl`

## Limitações Conhecidas

1. Templates não são removidos dinamicamente (servidor precisa reiniciar)
2. Não há validação de sprite IDs (cliente pode não ter o sprite)
3. Build strings não são validadas no servidor
4. Não há interface administrativa para gerenciar templates
