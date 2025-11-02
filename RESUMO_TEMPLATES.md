# Resumo das Alterações - Sistema de Templates

## O que foi implementado?

Conforme solicitado, foram implementadas duas funcionalidades principais:

### 1. ✅ Envio de Templates após Login do Usuário

Os templates agora são enviados automaticamente para o cliente assim que o usuário faz login com sucesso. Isso acontece antes mesmo do cliente receber as informações do mapa, garantindo que o dicionário de objetos esteja disponível.

**Arquivo modificado:** `src/controllers/messageRouter.js`

```javascript
// 2) Envia todos os templates de objetos
// Isso garante que o cliente tenha o dicionário de objetos disponível
sendAllTemplates(ws);
```

### 2. ✅ Adicionar Templates no Arquivo de Mapa (Igual aos Tiles)

Agora você pode adicionar templates diretamente no arquivo JSON do mapa, da mesma forma que você adiciona tiles. Basta adicionar um array `templates` no JSON.

**Exemplo em `src/maps/worlds/test2.json`:**

```json
{
  "id": "caverealm",
  "version": 18,
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
  "tiles": [
    [325, 325, 325, ...],
    ...
  ]
}
```

## Como Usar

### Para Adicionar Templates a um Mapa:

1. Abra o arquivo JSON do mapa em `src/maps/worlds/`
2. Adicione um array `templates` no nível raiz (junto com `id`, `width`, `height`, etc.)
3. Adicione seus templates no formato mostrado acima
4. **IMPORTANTE:** Incremente o número da `version` do mapa
5. Reinicie o servidor
6. Os templates serão automaticamente registrados e enviados aos clientes

### Estrutura de um Template:

```json
{
  "tpl": "id_unico",           // ID único do template
  "name": "Nome do Objeto",    // Nome exibido
  "desc": "Descrição",         // Descrição do objeto
  "stack": 0,                  // Pode empilhar? (0 ou 1)
  "pickup": 1,                 // Pode coletar? (0 ou 1)
  "block": 0,                  // Bloqueia passagem? (0 ou 1)
  "spr": 650,                  // ID do sprite no item16 atlas
  "build": "650f,a"            // String de construção visual
}
```

### String de Build:

A string `build` define como o objeto aparece no mapa:

- **Números negativos**: Usam atlas de tiles (tile16)
- **Números positivos**: Usam atlas de itens (item16)
- **`f`**: Renderiza na frente do jogador
- **`a`**: Objeto animado
- **`o|-20|`**: Offset vertical de -20 pixels
- **Múltiplos sprites**: Separe com vírgula: `"812, 813f"`

## Arquivos Modificados

1. **`src/controllers/messageRouter.js`**
   - Adicionada importação de `sendAllTemplates`
   - Adicionada chamada para enviar templates após login

2. **`src/services/templateService.js`**
   - Refatorado para suportar templates dinâmicos
   - Adicionada função `registerTemplates()` para registrar templates de mapas
   - Adicionada função `getAllTemplates()` para obter todos os templates
   - Sistema de prevenção de duplicatas

3. **`src/services/mapService.js`**
   - Adicionada importação de `registerTemplates`
   - Atualizado método `loadAll()` para carregar templates dos mapas
   - Documentação atualizada no cabeçalho

4. **`src/maps/worlds/test2.json`**
   - Adicionado array `templates` com 4 exemplos
   - Versão incrementada para 18

5. **`.gitignore`**
   - Criado para ignorar arquivos de teste e dependências

## Documentação

- **`TEMPLATES_DOCUMENTATION.md`** - Documentação completa em português com exemplos e guia de uso
- **`README.md`** - Atualizado para mencionar o sistema de templates

## Comportamento de Duplicatas

- Templates definidos em `src/models/objectTemplates.js` (estáticos) têm prioridade
- Templates de mapa com mesmo ID que templates estáticos são **ignorados**
- Templates únicos de mapa são adicionados ao registro
- Se múltiplos mapas têm o mesmo template, o último carregado prevalece

## Fluxo de Login Atualizado

1. Cliente envia 'login' ou 'guest'
2. Servidor autentica
3. Servidor envia 'accepted'
4. **→ Servidor envia TODOS os templates** ← NOVO
5. Servidor envia template do jogador
6. Servidor envia snapshot do jogador
7. Servidor envia informações do mapa
8. Servidor envia viewport
9. Cliente está pronto!

## Testes

Para testar localmente, use:

```bash
# Verificar sintaxe
node --check src/services/templateService.js
node --check src/services/mapService.js
node --check src/controllers/messageRouter.js

# Validar JSON do mapa
node -e "console.log(JSON.parse(require('fs').readFileSync('src/maps/worlds/test2.json', 'utf8')))"
```

## Próximos Passos (Opcional)

Se desejar expandir este sistema no futuro:

1. Interface administrativa para gerenciar templates
2. Validação de sprites no servidor
3. Hot-reload de templates sem reiniciar servidor
4. Templates com parâmetros variáveis
5. Sistema de categorias de templates

## Compatibilidade

- ✅ Node.js 22+
- ✅ MongoDB 6+
- ✅ Cliente ML compatível com protocolo `obj_tpl`
- ✅ Retrocompatível com mapas sem templates

## Conclusão

O sistema está completamente funcional e pronto para uso. Você pode agora:

1. ✅ Definir templates globais em `src/models/objectTemplates.js`
2. ✅ Definir templates por mapa nos arquivos JSON
3. ✅ Templates são enviados automaticamente após login
4. ✅ Cliente recebe dicionário completo de objetos

Tudo foi implementado conforme solicitado!
