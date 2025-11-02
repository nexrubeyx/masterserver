# IMPLEMENTAÇÃO: Object Placements

## Resumo

Implementado suporte completo para **objectPlacements** - um sistema que permite colocar objetos template em coordenadas específicas do mapa automaticamente.

## Problema Original

O usuário tinha templates definidos no mapa mas queria **colocar instâncias desses templates em coordenadas x,y específicas** no mundo, ao invés de apenas ter as definições dos templates.

## Solução Implementada

### 1. Nova Funcionalidade: `objectPlacements`

Adicionado suporte para um novo array no JSON do mapa:

```json
{
  "objectPlacements": [
    { "tpl": "tree_oak", "x": 5, "y": 8 },
    { "tpl": "barrel_small", "x": 10, "y": 12 }
  ]
}
```

### 2. Arquivos Modificados

#### `src/services/mapObjectsLoader.js`
- Adicionada função `sendMapObjectPlacementsToPlayer()`
- Envia objetos estáticos (templates) para o jogador
- Similar à função existente para objetos animados
- Validação de coordenadas e templates

#### `src/services/playerService.js`
- Importado `sendMapObjectPlacementsToPlayer`
- Adicionada chamada à função após enviar viewport
- Integrado no fluxo de login/spawn do jogador

#### `src/maps/worlds/test2.json`
- Versão incrementada de 18 para 19
- Adicionado array `objectPlacements` com 9 exemplos:
  - 2x tree_oak (árvores)
  - 4x torch_wall (tochas)
  - 2x barrel_small (barris)
  - 1x chest_small (baú)

### 3. Documentação Criada

#### `TEMPLATES_DOCUMENTATION.md` (Atualizado)
- Nova seção sobre objectPlacements
- Exemplos de uso
- Diferença entre templates e placements
- Lista de arquivos modificados atualizada

#### `OBJECT_PLACEMENTS_GUIDE.md` (Novo)
- Guia completo em português
- Explicação passo a passo
- Múltiplos exemplos de uso
- Casos de uso comuns (cidade, masmorra, floresta)
- Solução de problemas
- Dicas e boas práticas

#### `EXAMPLE_MAP_LAYOUT.md` (Novo)
- Representação visual do mapa
- Mostra onde cada objeto está colocado
- Explicação do protocolo de rede
- Vantagens da abordagem

#### `README.md` (Atualizado)
- Adicionado "Colocação de Objetos" nas características
- Adicionado comando de teste

### 4. Teste Automatizado

#### `test-object-placements.js` (Novo)
Script de teste que valida:
- ✅ Carregamento do mapa
- ✅ Validação de templates
- ✅ Validação de objectPlacements
- ✅ Coordenadas dentro dos limites
- ✅ Templates existem
- ✅ Geração de pacotes de rede
- ✅ Sintaxe dos arquivos modificados

**Resultado:** Todos os testes passando ✅

## Como Usar

### 1. Definir Templates

```json
{
  "templates": [
    {
      "tpl": "tree_oak",
      "name": "Árvore de Carvalho",
      "spr": 720,
      "block": 1,
      "build": "-305, o|-20| -289f"
    }
  ]
}
```

### 2. Adicionar Object Placements

```json
{
  "objectPlacements": [
    { "tpl": "tree_oak", "x": 5, "y": 8 }
  ]
}
```

### 3. Incrementar Versão

```json
{
  "version": 2  // Era 1, agora é 2
}
```

### 4. Reiniciar Servidor

```bash
npm start
```

## Fluxo de Execução

1. **Servidor Inicia**
   - MapService carrega mapas de `src/maps/worlds/*.json`
   - Templates são registrados via `registerTemplates()`
   - ObjectPlacements são armazenados no objeto do mapa

2. **Jogador Conecta e Faz Login**
   - Cliente envia 'client' e 'login'/'guest'
   - Servidor envia 'accepted'
   - **Servidor envia todos os templates** via `sendAllTemplates()`

3. **Jogador Entra no Mapa**
   - Servidor envia viewport (tiles visíveis)
   - **Servidor envia objectSpawns** (objetos animados)
   - **Servidor envia objectPlacements** (objetos estáticos) ← NOVO
   
4. **Cliente Renderiza**
   - Cliente já tem os templates
   - Cliente desenha objetos nas coordenadas especificadas

## Protocolo de Rede

Para cada objeto em objectPlacements, o servidor envia:

```javascript
{
  "type": "o",           // Object placement
  "x": 5,                // Coordenada X
  "y": 8,                // Coordenada Y  
  "d": "tree_oak"        // ID do template
}
```

## Validações Implementadas

- ✅ Verifica se `tpl`, `x` e `y` existem
- ✅ Verifica se `x` e `y` são números
- ✅ Ignora placements inválidos (não quebra o servidor)
- ✅ Logs de debug para troubleshooting

## Compatibilidade

- ✅ Não quebra mapas existentes (objectPlacements é opcional)
- ✅ Compatível com objectSpawns (objetos animados)
- ✅ Compatível com templates globais e de mapa
- ✅ Versão do mapa controla atualizações

## Vantagens

1. **Mapas Pré-Populados**: Designers podem criar mapas completos
2. **Facilita Desenvolvimento**: Não precisa colocar objetos manualmente
3. **Consistência**: Todos os jogadores veem os mesmos objetos
4. **Eficiência**: Objetos enviados automaticamente
5. **Flexibilidade**: Fácil adicionar/remover objetos via JSON

## Limitações Conhecidas

1. Objetos são estáticos (não se movem)
2. Não há remoção dinâmica (requer reinício do servidor)
3. Não há validação de colisão (múltiplos objetos podem estar no mesmo tile)
4. Sprite IDs não são validados (assume que cliente tem o sprite)

## Exemplo de Teste

```bash
# Rodar teste automatizado
node test-object-placements.js

# Saída esperada:
# ✅ Mapa carregado: caverealm v19
# ✅ Templates encontrados: 4
# ✅ Object placements encontrados: 9
# ✅ Pacotes gerados: 9
# ✅ SUCESSO: Funcionalidade implementada corretamente!
```

## Próximos Passos Sugeridos

Para o usuário, agora é possível:

1. ✅ Definir templates no mapa
2. ✅ Colocar objetos em coordenadas específicas
3. ✅ Ver objetos automaticamente ao entrar no mapa
4. 🔜 Criar mapas complexos (cidades, masmorras, florestas)
5. 🔜 Combinar com objectSpawns para objetos animados
6. 🔜 Implementar sistemas de quests usando objetos

## Testes Realizados

- [x] Sintaxe JavaScript válida
- [x] JSON válido
- [x] Templates carregam corretamente
- [x] ObjectPlacements são processados
- [x] Pacotes de rede são gerados corretamente
- [x] Coordenadas são validadas
- [x] Documentação completa

## Resultado

✅ **Implementação Completa e Funcional**

O sistema de objectPlacements está totalmente implementado, testado e documentado. O usuário agora pode colocar objetos template em coordenadas específicas do mapa usando o array `objectPlacements` no JSON do mapa.
