# Exemplo Visual: Mapa com Object Placements

## Mapa: caverealm (test2.json)

Este mapa demonstra a funcionalidade de **objectPlacements** com 9 objetos colocados automaticamente.

### Layout do Mapa (15x15)

```
   0  1  2  3  4  5  6  7  8  9 10 11 12 13 14
0  ████████████████████████████████████████████
1  ████████████████████████████████████████████
2  ██████▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓████████████
3  ██████▓▓▓🌳▓▓▓▓▓▓▓▓▓▓▓▓🌳▓▓▓▓████████████
4  ██████▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓████████████
5  ██████▓▓▓🔥▓▓▓▓▓▓▓▓▓▓▓▓🔥▓▓▓▓████████████
6  ██████▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓████████████
7  ██████▓▓▓▓▓🛢️▓▓▓▓▓🛢️▓▓▓▓▓▓▓▓████████████
8  ██████▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓████████████
9  ██████▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓████████████
10 ██████▓▓▓▓▓▓▓▓▓📦▓▓▓▓▓▓▓▓▓▓▓▓████████████
11 ██████▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓████████████
12 ██████▓▓▓🔥▓▓▓▓▓▓▓▓▓▓▓▓🔥▓▓▓▓████████████
13 ██████▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓████████████
14 ████████████████████████████████████████████

Legenda:
████ = Tile 325 (Parede de caverna)
▓▓▓▓ = Tile 21  (Chão de caverna)
🌳 = tree_oak (Árvore de Carvalho)
🛢️ = barrel_small (Barril Pequeno)
🔥 = torch_wall (Tocha de Parede)
📦 = chest_small (Baú Pequeno)
```

### Objetos Colocados

#### 1. Árvores (tree_oak) - 2x
Bloqueiam passagem e decoram as bordas norte do mapa.
- Posição 1: (3, 3)
- Posição 2: (11, 3)

#### 2. Tochas (torch_wall) - 4x
Iluminam o ambiente, podem ser coletadas.
- Posição 1: (3, 5) - Parede oeste, norte
- Posição 2: (11, 5) - Parede leste, norte
- Posição 3: (3, 12) - Parede oeste, sul
- Posição 4: (11, 12) - Parede leste, sul

#### 3. Barris (barrel_small) - 2x
Objetos decorativos no meio do mapa.
- Posição 1: (5, 7)
- Posição 2: (9, 7)

#### 4. Baú (chest_small) - 1x
Baú de tesouro no centro-sul do mapa.
- Posição 1: (7, 10)

### Código JSON (test2.json)

```json
{
  "id": "caverealm",
  "version": 19,
  "title": "Custom Map",
  "width": 15,
  "height": 15,
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
    },
    {
      "tpl": "torch_wall",
      "name": "Tocha de Parede",
      "desc": "Uma tocha iluminando a parede.",
      "stack": 0,
      "pickup": 1,
      "block": 0,
      "spr": 650,
      "build": "650f,a"
    },
    {
      "tpl": "chest_small",
      "name": "Baú Pequeno",
      "desc": "Um baú para guardar itens.",
      "stack": 0,
      "pickup": 0,
      "block": 1,
      "spr": 800,
      "build": "800"
    }
  ],
  "objectPlacements": [
    { "tpl": "tree_oak", "x": 3, "y": 3 },
    { "tpl": "tree_oak", "x": 11, "y": 3 },
    { "tpl": "barrel_small", "x": 5, "y": 7 },
    { "tpl": "barrel_small", "x": 9, "y": 7 },
    { "tpl": "chest_small", "x": 7, "y": 10 },
    { "tpl": "torch_wall", "x": 3, "y": 5 },
    { "tpl": "torch_wall", "x": 11, "y": 5 },
    { "tpl": "torch_wall", "x": 3, "y": 12 },
    { "tpl": "torch_wall", "x": 11, "y": 12 }
  ]
}
```

### Como Funciona

1. **Servidor Inicia**: Carrega o mapa e registra os templates
2. **Jogador Faz Login**: Recebe todos os templates via `sendAllTemplates()`
3. **Jogador Entra no Mapa**: Servidor envia viewport com tiles
4. **Objetos São Colocados**: Servidor envia pacotes `type: "o"` para cada objectPlacement
5. **Cliente Renderiza**: Cliente desenha os objetos nas coordenadas especificadas

### Protocolo de Rede

Quando um jogador entra no mapa, o servidor envia:

```javascript
// Para cada objeto em objectPlacements:
{
  "type": "o",       // Object placement
  "x": 3,            // Coordenada X
  "y": 3,            // Coordenada Y
  "d": "tree_oak"    // ID do template
}
```

O cliente já recebeu o template durante o login, então sabe como renderizar o objeto.

### Vantagens desta Abordagem

✅ **Mapas Pré-Populados**: Crie mapas com objetos já colocados
✅ **Facilita Design**: Designers podem criar mapas completos em JSON
✅ **Consistência**: Todos os jogadores veem os mesmos objetos
✅ **Eficiência**: Objetos enviados automaticamente na entrada do mapa
✅ **Flexibilidade**: Fácil adicionar, remover ou mover objetos

### Próximos Passos

Agora você pode:
1. Modificar test2.json para adicionar mais objetos
2. Criar seus próprios mapas com objectPlacements
3. Combinar com objectSpawns para objetos animados
4. Criar cenários complexos (cidades, masmorras, florestas)

### Referências

- `OBJECT_PLACEMENTS_GUIDE.md` - Guia completo de uso
- `TEMPLATES_DOCUMENTATION.md` - Documentação de templates
- `test-object-placements.js` - Script de teste
