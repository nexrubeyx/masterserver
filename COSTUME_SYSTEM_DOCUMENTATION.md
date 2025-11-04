# Sistema de Costumes (Fantasias) - Documentação

## Visão Geral

Este documento descreve a implementação completa do sistema de costumes (fantasias/monstros) no servidor, incluindo a correção do bug de movimento durante mudanças de aparência.

## Problema Resolvido

### 1. Bug de Movimento Durante Mudança de Aparência
**Problema**: Quando o jogador mudava de aparência (costume, body, hair, clothes), ele poderia continuar se movendo, causando bugs visuais com dx/dy (offsets de posição) e dessincronia entre cliente e servidor.

**Solução**: Implementado `stopMoving()` antes de qualquer mudança de aparência para:
- Parar movimento imediatamente
- Limpar acumulador de tempo (`_accumMs = 0`)
- Sincronizar snapshot com outros jogadores
- Prevenir bugs de dx/dy

### 2. Sistema de Costumes Ausente
**Problema**: O servidor não tinha implementação do sistema de costumes que o cliente esperava.

**Solução**: Implementação completa do sistema de costumes com:
- Loja de costumes com UI interativa
- Sistema de compra com diamantes (premium)
- Sistema de tentativa temporária (Halloween)
- Persistência de costumes desbloqueados
- Sincronização com cliente

## Arquitetura

### Modelos de Dados

#### User Model (`src/models/User.js`)
```javascript
{
  costumes: Array<number>,      // IDs de costumes desbloqueados [1, 2, 5, 10, ...]
  costumeList: Object,          // Mapa ID -> custo {1: 2, 2: 3, ...}
  costumePercent: number        // Porcentagem de costumes desbloqueados (0-100)
}
```

**Novas Funções**:
- `addCostumeToUser(userId, costumeId)` - Desbloqueia um costume
- `getUserCostumeData(userId)` - Obtém dados de costumes do usuário
- `deductPremiumDays(userId, days)` - Deduz diamantes/premium

### Costume Service (`src/services/costumeService.js`)

**Configuração**:
- 148 costumes disponíveis (max_costume = 148)
- Preços variam de 2 a 100 diamantes
- Categorias: Baratos (2-5), Médios (5-15), Caros (20-50), Raros (60-100)

**Funções Principais**:
- `makeCostumeShopPacket(player, user)` - Gera pacotes da loja de costumes
- `makeCostumeDataPacket(user)` - Gera pacote de sincronização de dados
- `buyCostume(user, costumeId)` - Processa compra de costume
- `getCostumeCost(costumeId)` - Retorna custo de um costume

## Protocolo de Comunicação

### Mensagens do Cliente → Servidor

#### 1. Abrir Loja de Costumes
```javascript
{
  "type": "c",
  "r": "cs"
}
```
**Resposta**: Pacote `pkg` com template da loja + pacote `costumes` com dados

#### 2. Comprar Costume
```javascript
{
  "type": "c",
  "r": "cb",
  "c": 10  // ID do costume
}
```
**Resposta**: Pacote `cb` com resultado da compra

#### 3. Tentar Costume (Halloween)
```javascript
{
  "type": "c",
  "r": "cbh",
  "c": 10  // ID do costume
}
```
**Resposta**: Template e snapshot atualizados (sem persistência)

#### 4. Aplicar Aparência
```javascript
{
  "type": "c",
  "r": "ap",
  "b": 1,   // body
  "h": 2,   // hair
  "c": 3,   // clothes
  "cc": 14540253,  // clothes_color
  "hc": 6504471,   // hair_color
  "ec": 255,       // eye_color
  "nc": 15724527   // name_color
}
```
**Resposta**: Template e snapshot atualizados

### Mensagens do Servidor → Cliente

#### 1. Pacote de Loja de Costumes
```javascript
{
  "type": "pkg",
  "data": "[
    {\"type\":\"fx_tpl\",\"tpl\":\"costume_shop\",\"code\":\"...\"},
    {\"type\":\"fx\",\"tpl\":\"costume_shop\",\"x\":39,\"y\":26,\"s\":-1,\"d\":0}
  ]"
}
```

#### 2. Pacote de Dados de Costumes
```javascript
{
  "type": "costumes",
  "c": [1, 2, 3, 5, 10],  // Costumes desbloqueados
  "l": {                   // Lista de preços
    "1": 2,
    "2": 3,
    "3": 4,
    // ... todos os 148 costumes
  },
  "p": 3  // Porcentagem de progresso
}
```

#### 3. Confirmação de Compra
```javascript
{
  "type": "cb",
  "b": 10,                    // Costume comprado (opcional)
  "r": "Costume 10 purchased!",  // Mensagem
  "pr": 95                    // Premium restante
}
```

## Fluxo de Operações

### Login do Jogador
1. Jogador faz login
2. Servidor carrega dados do usuário do MongoDB
3. Servidor envia pacote `game` com premium
4. **Servidor envia pacote `costumes` com lista de costumes desbloqueados**
5. Cliente habilita botão "Costume Shop" se tiver premium ou level >= 1

### Abrir Loja de Costumes
1. Cliente envia `{type:"c", r:"cs"}`
2. Servidor carrega dados de costumes do usuário
3. Servidor envia pacote `costumes` (atualização)
4. Servidor envia pacote `pkg` com template da loja
5. Cliente renderiza interface da loja com preview de costumes

### Comprar Costume
1. Cliente envia `{type:"c", r:"cb", c:10}`
2. Servidor valida:
   - Costume ID válido (0-148)
   - Usuário não possui o costume
   - Usuário tem diamantes suficientes
3. Servidor deduz diamantes do usuário
4. Servidor adiciona costume à lista de desbloqueados
5. Servidor atualiza `costumePercent`
6. **Servidor para movimento do jogador (stopMoving)**
7. Servidor aplica costume ao jogador (sprite = costumeId)
8. Servidor salva no banco de dados
9. Servidor envia confirmação com premium atualizado
10. Servidor atualiza template e snapshot para todos os jogadores

### Tentar Costume (Halloween)
1. Cliente envia `{type:"c", r:"cbh", c:10}`
2. Servidor valida costume ID
3. **Servidor para movimento do jogador (stopMoving)**
4. Servidor aplica costume temporariamente (não salva no banco)
5. Servidor atualiza template e snapshot para todos os jogadores
6. Jogador vê o costume mas não é permanente

## Prevenção de Bugs de Movimento

### Problema Original
Quando o jogador mudava de aparência enquanto se movia:
- Cliente continuava animando movimento
- Valores dx/dy ficavam dessincronizados
- Personagem "pulava" ou aparecia em posições incorretas
- Outros jogadores viam o personagem em posição errada

### Solução Implementada
Antes de qualquer mudança de aparência:
```javascript
// IMPORTANTE: Para movimento antes de mudar aparência
if (player.moving) {
  world.playerService.stopMoving(player);
}
```

Isso garante:
- Movimento é interrompido imediatamente
- Acumulador de tempo é zerado
- Posição atual é confirmada como final
- dx e dy ficam iguais a x e y (sem offset)
- Snapshot enviado aos outros jogadores reflete estado correto

### Locais Onde Foi Aplicado
1. **Compra de costume** (`r: "cb"`)
2. **Tentativa de costume** (`r: "cbh"`)
3. **Aplicação de aparência** (`r: "ap"`)

## Custos dos Costumes

### Distribuição de Preços
- **IDs 1-10**: 2-5 diamantes (entrada, Halloween)
- **IDs 11-50**: 5-15 diamantes (comuns)
- **IDs 51-100**: 20-50 diamantes (raros)
- **IDs 101-148**: 60-100 diamantes (muito raros/premium)

### Lógica de Negócio
- Costume ID 0 = remover costume (sempre grátis)
- Costumes já possuídos podem ser aplicados gratuitamente
- Tentativa temporária disponível se:
  - Custo <= 60 diamantes OU
  - Jogador tem diamantes >= custo

## Sistema de Tiers (Níveis)

O cliente calcula tiers baseado na porcentagem:
- Tier 1: 0-4% (0-5 costumes)
- Tier 2: 5-14% (6-20 costumes)
- Tier 3: 15-29% (21-42 costumes)
- Tier 4: 30-44% (43-64 costumes)
- Tier 5: 45-59% (65-86 costumes)
- Tier 6: 60-69% (87-101 costumes)
- Tier 7: 70-79% (102-116 costumes)
- Tier 8: 80-89% (117-131 costumes)
- Tier 9: 90-99% (132-146 costumes)
- Tier 10: 100% (148 costumes = todos)

## Interface do Cliente

A loja de costumes renderizada no cliente inclui:
- Preview do costume atual (centro)
- Preview do costume anterior (esquerda, translúcido)
- Preview do costume seguinte (direita, translúcido)
- Botões de navegação (< e >)
- Slider para navegação rápida
- Informações de tier e porcentagem
- Contador de diamantes
- Botão "Try it on" (se disponível)
- Botão "Buy this for X" ou "Apply this costume"

### Código da Interface
O código JavaScript da interface é enviado como string no pacote `fx_tpl` e executado no cliente usando a função `start()` do template.

## Persistência

### Banco de Dados (MongoDB)
Campos na coleção `users`:
```javascript
{
  costumes: [1, 2, 3, 5, 10, ...],  // Array de IDs
  costumeList: {},                   // Sempre vazio no DB (preenchido pelo servidor)
  costumePercent: 3                  // Calculado automaticamente
}
```

### Atualização Automática
- `addCostumeToUser()` adiciona costume e recalcula porcentagem
- Porcentagem = `Math.ceil((costumes.length / 148) * 100)`

## Testes

### Executar Testes
```bash
node test-costume-system.js
```

### Cobertura de Testes
- ✓ Geração de pacote de costume shop
- ✓ Geração de pacote de dados
- ✓ Verificação de custos
- ✓ Processamento de compra (sucesso/falha)
- ✓ Validação de IDs inválidos

## Segurança

### Validações Implementadas
1. **Costume ID**: Deve ser 0-148
2. **Premium suficiente**: Verifica antes de comprar
3. **Costume já possuído**: Não cobra novamente
4. **Integridade de movimento**: Sempre para antes de mudar

### Proteções Contra Exploits
- Schema valida tipos e ranges de dados
- Servidor é autoridade para posição e aparência
- Dados sensíveis (premium) não podem ser manipulados pelo cliente

## Troubleshooting

### Costume shop não abre
- Verificar se jogador tem premium > 0 OU level >= 1
- Verificar se não é guest (username não contém "guest-")
- Verificar logs do servidor para erros de importação

### Personagem "pula" ao mudar costume
- Verificar se `stopMoving()` está sendo chamado
- Verificar logs de sincronização de posição
- Verificar se snapshot está sendo enviado a todos os jogadores

### Costume não persiste após logout
- Verificar se `persistFullState()` foi chamado
- Verificar conexão com MongoDB
- Verificar campo `appearance.sprite` no banco

## Compatibilidade

### Cliente
- Requer versão do cliente que suporte:
  - Pacote `costumes` (type: "costumes")
  - Pacote `cb` (type: "cb")
  - Templates `fx_tpl` e `fx`
  - Array `monster` com 148 sprites

### Servidor
- Node.js 22+
- MongoDB com coleções `users` e `players`
- Suporte a ES Modules (type: "module")

## Roadmap Futuro

Possíveis melhorias:
1. Sistema de achievements para desbloquear costumes
2. Costumes sazonais (Halloween, Natal, etc)
3. Costumes exclusivos por tier/ranking
4. Sistema de preview antes de comprar
5. Histórico de compras de costumes
6. Sistema de "favoritos" para costumes
7. Troca/presente de costumes entre jogadores

## Referências

- `src/models/User.js` - Modelo de dados de usuário
- `src/services/costumeService.js` - Lógica de negócio de costumes
- `src/controllers/messageRouter.js` - Handlers de protocolo
- `src/protocol/schema.js` - Validação de mensagens
- `test-costume-system.js` - Testes automatizados
