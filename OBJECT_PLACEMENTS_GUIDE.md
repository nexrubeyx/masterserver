# Guia de Uso: Object Placements

## O que é Object Placements?

Object Placements é um recurso que permite **colocar objetos template em coordenadas específicas do mapa** automaticamente. Quando um jogador entra no mapa, todos os objetos definidos em `objectPlacements` aparecem nas posições especificadas.

## Diferença entre Templates e Object Placements

### Templates
Define **o que** é um objeto (aparência, nome, propriedades):
```json
{
  "tpl": "tree_oak",
  "name": "Árvore de Carvalho",
  "desc": "Uma árvore grande.",
  "spr": 720,
  "block": 1,
  "build": "-305, o|-20| -289f"
}
```

### Object Placements
Define **onde** colocar objetos no mapa:
```json
{
  "tpl": "tree_oak",
  "x": 5,
  "y": 8
}
```

## Como Usar

### Passo 1: Definir Templates

Primeiro, defina os templates no array `templates` do seu mapa:

```json
{
  "id": "meu_mapa",
  "version": 1,
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
      "tpl": "rock",
      "name": "Pedra",
      "desc": "Uma pedra no caminho.",
      "stack": 0,
      "pickup": 0,
      "block": 1,
      "spr": 650,
      "build": "650"
    }
  ]
}
```

### Passo 2: Adicionar Object Placements

Agora adicione o array `objectPlacements` para colocar esses objetos no mapa:

```json
{
  "id": "meu_mapa",
  "version": 1,
  "templates": [...],
  "objectPlacements": [
    { "tpl": "tree_oak", "x": 5, "y": 8 },
    { "tpl": "tree_oak", "x": 7, "y": 8 },
    { "tpl": "tree_oak", "x": 9, "y": 8 },
    { "tpl": "rock", "x": 10, "y": 5 },
    { "tpl": "rock", "x": 12, "y": 5 }
  ]
}
```

### Passo 3: Incrementar Versão

**IMPORTANTE**: Sempre que modificar templates ou objectPlacements, incremente a versão:

```json
{
  "id": "meu_mapa",
  "version": 2,  // Era 1, agora é 2
  ...
}
```

### Passo 4: Reiniciar Servidor

```bash
npm start
```

## Exemplo Completo

Aqui está um exemplo completo de um mapa com objectPlacements:

```json
{
  "id": "floresta",
  "version": 1,
  "title": "Floresta Mística",
  "width": 30,
  "height": 30,
  "templates": [
    {
      "tpl": "tree_oak",
      "name": "Árvore de Carvalho",
      "desc": "Uma árvore grande e robusta.",
      "stack": 0,
      "pickup": 0,
      "block": 1,
      "spr": 720,
      "build": "-305, o|-20| -289f"
    },
    {
      "tpl": "flower_red",
      "name": "Flor Vermelha",
      "desc": "Uma bela flor vermelha.",
      "stack": 0,
      "pickup": 1,
      "block": 0,
      "spr": 845,
      "build": "845"
    },
    {
      "tpl": "mushroom",
      "name": "Cogumelo",
      "desc": "Um cogumelo selvagem.",
      "stack": 1,
      "pickup": 1,
      "block": 0,
      "spr": 850,
      "build": "850"
    },
    {
      "tpl": "sign",
      "name": "Placa de Madeira",
      "desc": "Uma placa indicativa.",
      "stack": 0,
      "pickup": 0,
      "block": 0,
      "spr": 900,
      "build": "900f"
    }
  ],
  "objectPlacements": [
    // Linha de árvores no norte
    { "tpl": "tree_oak", "x": 5, "y": 3 },
    { "tpl": "tree_oak", "x": 8, "y": 3 },
    { "tpl": "tree_oak", "x": 11, "y": 3 },
    { "tpl": "tree_oak", "x": 14, "y": 3 },
    
    // Flores decorativas
    { "tpl": "flower_red", "x": 10, "y": 10 },
    { "tpl": "flower_red", "x": 12, "y": 10 },
    { "tpl": "flower_red", "x": 10, "y": 12 },
    { "tpl": "flower_red", "x": 12, "y": 12 },
    
    // Cogumelos esparsos
    { "tpl": "mushroom", "x": 7, "y": 15 },
    { "tpl": "mushroom", "x": 9, "y": 16 },
    { "tpl": "mushroom", "x": 8, "y": 18 },
    
    // Placa de entrada
    { "tpl": "sign", "x": 15, "y": 15 }
  ],
  "tiles": [
    // ... seu array de tiles aqui
  ]
}
```

## Dicas e Boas Práticas

### 1. Organização
Agrupe objectPlacements por tipo ou área para facilitar edição:

```json
"objectPlacements": [
  // === ÁRVORES ===
  { "tpl": "tree_oak", "x": 5, "y": 3 },
  { "tpl": "tree_oak", "x": 8, "y": 3 },
  
  // === DECORAÇÃO ===
  { "tpl": "flower_red", "x": 10, "y": 10 },
  { "tpl": "flower_red", "x": 12, "y": 10 },
  
  // === FUNCIONAL ===
  { "tpl": "chest", "x": 15, "y": 15 },
  { "tpl": "sign", "x": 14, "y": 15 }
]
```

### 2. Validação de Coordenadas
Certifique-se de que as coordenadas estão dentro do mapa:
- `x` deve ser entre 0 e `width - 1`
- `y` deve ser entre 0 e `height - 1`

### 3. Templates Devem Existir
Todo `tpl` em objectPlacements deve existir em:
- Array `templates` do mapa, OU
- Arquivo `src/models/objectTemplates.js`

### 4. Objetos Empilhados
Você pode colocar múltiplos objetos na mesma coordenada:

```json
"objectPlacements": [
  { "tpl": "floor_wood", "x": 10, "y": 10 },
  { "tpl": "table", "x": 10, "y": 10 },
  { "tpl": "lamp", "x": 10, "y": 10 }
]
```

### 5. Teste Primeiro
Use o script de teste para validar antes de iniciar o servidor:

```bash
node test-object-placements.js
```

## Casos de Uso Comuns

### Decorar Cidade
```json
"objectPlacements": [
  // Árvores decorativas
  { "tpl": "tree_oak", "x": 5, "y": 5 },
  { "tpl": "tree_oak", "x": 25, "y": 5 },
  
  // Bancos de praça
  { "tpl": "bench", "x": 10, "y": 10 },
  { "tpl": "bench", "x": 20, "y": 10 },
  
  // Postes de luz
  { "tpl": "lamp_post", "x": 8, "y": 8 },
  { "tpl": "lamp_post", "x": 15, "y": 8 },
  { "tpl": "lamp_post", "x": 22, "y": 8 }
]
```

### Masmorra
```json
"objectPlacements": [
  // Tochas nas paredes
  { "tpl": "torch_wall", "x": 3, "y": 5 },
  { "tpl": "torch_wall", "x": 3, "y": 10 },
  { "tpl": "torch_wall", "x": 3, "y": 15 },
  
  // Baús de tesouro
  { "tpl": "chest_treasure", "x": 10, "y": 20 },
  
  // Armadilhas
  { "tpl": "spike_trap", "x": 7, "y": 12 },
  { "tpl": "spike_trap", "x": 8, "y": 12 }
]
```

### Floresta
```json
"objectPlacements": [
  // Árvores aleatórias
  { "tpl": "tree_oak", "x": 5, "y": 3 },
  { "tpl": "tree_pine", "x": 8, "y": 5 },
  { "tpl": "tree_oak", "x": 12, "y": 4 },
  { "tpl": "tree_pine", "x": 15, "y": 7 },
  
  // Arbustos
  { "tpl": "bush", "x": 6, "y": 8 },
  { "tpl": "bush", "x": 9, "y": 9 },
  
  // Pedras
  { "tpl": "rock_large", "x": 11, "y": 11 },
  { "tpl": "rock_small", "x": 13, "y": 12 }
]
```

## Solução de Problemas

### Objetos Não Aparecem
1. ✅ Verificar se templates estão definidos
2. ✅ Verificar se versão do mapa foi incrementada
3. ✅ Reiniciar servidor após mudanças
4. ✅ Verificar coordenadas estão dentro do mapa
5. ✅ Rodar `node test-object-placements.js`

### Objetos Aparecem com Sprite Errado
- Verificar se o `spr` no template está correto
- Verificar se o cliente tem aquele sprite ID

### Servidor Não Inicia
- Verificar sintaxe JSON (use um validador)
- Verificar se todos os campos obrigatórios estão presentes
- Ver logs do servidor para erros específicos

## Próximos Passos

Depois de dominar objectPlacements, você pode:

1. **Combinar com objectSpawns** para objetos animados
2. **Usar templates globais** em `src/models/objectTemplates.js`
3. **Criar mapas complexos** com múltiplas áreas decoradas
4. **Implementar sistemas de quests** usando placas e NPCs

## Referências

- `TEMPLATES_DOCUMENTATION.md` - Documentação completa de templates
- `src/maps/worlds/test2.json` - Exemplo funcional
- `src/services/mapObjectsLoader.js` - Implementação do código
