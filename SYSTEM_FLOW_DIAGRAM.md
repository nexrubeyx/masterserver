# Fluxo do Sistema de Usuários Padrão

```
┌─────────────────────────────────────────────────────────────────┐
│                      INICIALIZAÇÃO DO SERVIDOR                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Carrega .env    │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Cria Logger     │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Conecta MongoDB  │
                    └──────────────────┘
                              │
                              ▼
    ┌──────────────────────────────────────────────────────────┐
    │      NOVO: Inicializa Usuários Padrão                    │
    │      (initializeDefaultUsers)                            │
    └──────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
    ┌────────────────────┐      ┌────────────────────┐
    │ Lê defaultUsers    │      │ Erro de leitura?   │
    │ .json              │      │ → Registra warning │
    └────────────────────┘      │ → Continua startup │
                │               └────────────────────┘
                ▼
    ┌────────────────────┐
    │ Para cada usuário  │
    │ no JSON:           │
    └────────────────────┘
                │
                ▼
    ┌────────────────────────────────────────┐
    │ Busca usuário por username             │
    │ (findUserByUsername)                   │
    └────────────────────────────────────────┘
                │
        ┌───────┴───────┐
        ▼               ▼
┌──────────────┐  ┌──────────────────────┐
│ Já existe?   │  │ Não existe?          │
└──────────────┘  └──────────────────────┘
        │                     │
        ▼                     ▼
┌──────────────────┐  ┌──────────────────────────┐
│ Permissão igual? │  │ 1. Hash senha (bcrypt)   │
└──────────────────┘  │ 2. Cria usuário (DB)     │
        │             │ 3. Define permissão      │
        │             │ 4. Cria personagem (DB)  │
        ▼             └──────────────────────────┘
┌──────────────────┐              │
│ SIM: Pula        │              │
│ NÃO: Atualiza    │              │
│      permissão   │              │
└──────────────────┘              │
        │                         │
        └────────────┬────────────┘
                     ▼
          ┌────────────────────┐
          │ Log de conclusão   │
          └────────────────────┘
                     │
                     ▼
          ┌────────────────────┐
          │ Continua startup   │
          │ (World, WebSocket) │
          └────────────────────┘
```

## Estrutura de Dados

### defaultUsers.json
```json
[
  {
    "username": "admin",        ← Nome único
    "password": "admin123",     ← Texto plano (hasheado ao criar)
    "email": "admin@localhost", ← Email do usuário
    "permission": 4             ← 1=PLAYER, 2=CM, 3=GM, 4=MASTER
  },
  { ... }
]
```

### Coleção 'users' (MongoDB)
```javascript
{
  _id: ObjectId("..."),
  username: "admin",
  passwordHash: "$2a$10$...",  ← Bcrypt hash
  email: "admin@localhost",
  permission: 4,
  createdAt: Date,
  updatedAt: Date
}
```

### Coleção 'players' (MongoDB)
```javascript
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),     ← Referência ao user
  name: "admin",
  level: 1,
  mapId: "caverealm",
  x: 10,
  y: 10,
  speed: 350,
  inventory: [],
  appearance: { ... },
  createdAt: Date,
  updatedAt: Date
}
```

## Casos de Uso

### Caso 1: Primeiro Startup (Usuários não existem)
```
1. Servidor inicia
2. Lê JSON: admin e tester
3. Busca "admin" → não encontrado
4. Cria admin com hash de senha
5. Cria personagem para admin
6. Busca "tester" → não encontrado
7. Cria tester com hash de senha
8. Cria personagem para tester
9. Log: "2 usuários padrão criados"
```

### Caso 2: Restart (Usuários já existem)
```
1. Servidor reinicia
2. Lê JSON: admin e tester
3. Busca "admin" → encontrado
4. Permissão igual? → Sim, pula
5. Busca "tester" → encontrado
6. Permissão igual? → Sim, pula
7. Log: "Usuários padrão já existem"
```

### Caso 3: Atualização de Permissão
```
1. JSON alterado: admin agora tem permission: 3
2. Servidor reinicia
3. Busca "admin" → encontrado
4. Permissão igual? → Não (era 4, agora 3)
5. Atualiza permissão para 3
6. Log: "Permissão atualizada"
```

### Caso 4: Adicionar Novo Usuário
```
1. JSON alterado: adicionado "gamemaster"
2. Servidor reinicia
3. Processa admin e tester → já existem, pula
4. Processa gamemaster → não existe
5. Cria gamemaster com hash de senha
6. Cria personagem para gamemaster
7. Log: "1 novo usuário criado"
```

## Segurança do Fluxo

### Hash de Senha (Bcrypt)
```
Texto Plano: "admin123"
        ↓
bcrypt.hash("admin123", 10)
        ↓
Hash: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
        ↓
Armazenado no MongoDB
```

### Verificação de Login (Existente no authService)
```
Usuário digita: "admin123"
        ↓
bcrypt.compare("admin123", hashArmazenado)
        ↓
Retorna: true ou false
```

## Integração com Sistema Existente

### Antes (authService.js)
```javascript
// Login cria usuário se não existir (com email)
// Guest cria usuário temporário
```

### Depois
```javascript
// defaultUsersService cria usuários admin no startup
// authService continua funcionando normalmente
// Ambos usam as mesmas funções (createUser, createPlayer)
```

### Compatibilidade
- ✅ Usa funções existentes do modelo User e Player
- ✅ Segue mesmo padrão de hash de senha
- ✅ Respeita sistema de permissões existente
- ✅ Não interfere com login/registro normal
- ✅ Personagens criados com mesma estrutura

## Pontos de Extensão

### Adicionar mais campos no JSON
```json
{
  "username": "admin",
  "password": "admin123",
  "email": "admin@localhost",
  "permission": 4,
  "customField": "valor"  ← Fácil de adicionar
}
```

### Adicionar validações
```javascript
// Em defaultUsersService.js
if (userConfig.username.length < 3) {
  throw new Error('Username muito curto');
}
```

### Conectar com sistema de notificações
```javascript
// Após criar usuário
await notifyAdmins(`Novo usuário criado: ${username}`);
```

## Conclusão

O fluxo é:
1. **Simples** - Apenas lê JSON e cria usuários
2. **Seguro** - Hash de senha com bcrypt
3. **Idempotente** - Safe para múltiplas execuções
4. **Integrado** - Usa código existente do projeto
5. **Extensível** - Fácil adicionar novos campos/validações
