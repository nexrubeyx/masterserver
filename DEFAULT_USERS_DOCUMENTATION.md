# Sistema de Usuários Padrão

## Visão Geral

Este sistema permite configurar usuários padrão (como admin e tester) que são automaticamente criados quando o servidor inicia, caso eles ainda não existam no banco de dados.

## Arquivos Criados/Modificados

### 1. `src/config/defaultUsers.json`
Arquivo de configuração JSON que define os usuários padrão a serem criados.

**Estrutura:**
```json
[
  {
    "username": "admin",
    "password": "admin123",
    "email": "admin@localhost",
    "permission": 4
  },
  {
    "username": "tester",
    "password": "tester123",
    "email": "tester@localhost",
    "permission": 1
  }
]
```

**Campos:**
- `username` (string): Nome de usuário único
- `password` (string): Senha em texto plano (será hasheada automaticamente com bcrypt)
- `email` (string): Email do usuário
- `permission` (number): Nível de permissão
  - `1` = PLAYER (jogador normal)
  - `2` = CM (Community Manager)
  - `3` = GM (Game Master)
  - `4` = MASTER (Administrador máximo)

### 2. `src/services/defaultUsersService.js`
Serviço que gerencia a inicialização dos usuários padrão.

**Funções principais:**
- `initializeDefaultUsers(env, logger)`: Lê o JSON e cria os usuários
- `ensureDefaultUser(env, logger, userConfig)`: Cria ou atualiza um usuário específico

**Comportamento:**
- **Idempotente**: Executar múltiplas vezes não cria duplicatas
- **Atualização de permissão**: Se um usuário já existe mas tem permissão diferente, a permissão é atualizada
- **Criação de personagem**: Automaticamente cria um personagem para cada usuário novo
- **Tratamento de erros**: Se o arquivo JSON não existir ou estiver inválido, apenas registra um warning

### 3. `src/server.js`
Arquivo principal do servidor, modificado para chamar a inicialização de usuários padrão.

**Ordem de inicialização:**
1. Carrega variáveis de ambiente (.env)
2. Cria o logger
3. Conecta ao MongoDB
4. **Inicializa usuários padrão** ← NOVO
5. Cria o World (estado do jogo)
6. Inicia servidor WebSocket

### 4. `test-default-users.js`
Script de teste para verificar a funcionalidade.

## Como Usar

### Configurar Usuários Padrão

1. Edite o arquivo `src/config/defaultUsers.json`
2. Adicione, remova ou modifique usuários conforme necessário
3. Reinicie o servidor

**Exemplo - Adicionar um GM:**
```json
[
  {
    "username": "admin",
    "password": "admin123",
    "email": "admin@localhost",
    "permission": 4
  },
  {
    "username": "gamemaster",
    "password": "gm_password",
    "email": "gm@localhost",
    "permission": 3
  },
  {
    "username": "tester",
    "password": "tester123",
    "email": "tester@localhost",
    "permission": 1
  }
]
```

### Alterar Senha de um Usuário Padrão

**IMPORTANTE:** As senhas no JSON são em texto plano e são hasheadas durante a criação.

Para alterar a senha de um usuário existente:
1. Delete o usuário do banco de dados MongoDB
2. Altere a senha no `defaultUsers.json`
3. Reinicie o servidor (o usuário será recriado com a nova senha)

**Via MongoDB CLI:**
```bash
mongo mlgame
db.users.deleteOne({ username: "admin" })
db.players.deleteOne({ name: "admin" })
exit
```

Ou simplesmente pare o servidor, altere o JSON e reinicie.

### Mudar Permissão de um Usuário

Você pode atualizar a permissão de um usuário padrão sem deletá-lo:
1. Edite o `defaultUsers.json` e altere o campo `permission`
2. Reinicie o servidor
3. A permissão será automaticamente atualizada

## Logs

Quando o servidor inicia, você verá logs como:

```
[INFO] Verificando 2 usuários padrão...
[INFO] Criando usuário padrão... (username: "admin", permission: 4)
[INFO] Usuário padrão criado com sucesso (username: "admin", permission: 4)
[DEBUG] Usuário padrão já existe (username: "tester")
[INFO] Inicialização de usuários padrão concluída
```

## Testando

### Teste Automatizado
```bash
node test-default-users.js
```

Este teste:
- Limpa usuários de teste existentes
- Inicializa usuários padrão
- Verifica se admin e tester foram criados corretamente
- Valida senhas hasheadas
- Verifica personagens criados
- Testa idempotência (não duplica usuários)

### Teste Manual
1. Inicie o servidor: `npm start`
2. Verifique os logs para confirmar que os usuários foram criados
3. Conecte-se ao MongoDB e verifique:
```bash
mongo mlgame
db.users.find({ username: { $in: ["admin", "tester"] } }).pretty()
db.players.find({ name: { $in: ["admin", "tester"] } }).pretty()
```

4. Tente fazer login com as credenciais:
   - Username: `admin`, Password: `admin123`
   - Username: `tester`, Password: `tester123`

## Segurança

### Recomendações Importantes

1. **Altere as senhas padrão em produção**
   - As senhas no JSON de exemplo (`admin123`, `tester123`) são inseguras
   - Use senhas fortes e únicas

2. **Proteja o arquivo de configuração**
   - O `defaultUsers.json` contém senhas em texto plano
   - Não commite este arquivo com senhas reais no Git
   - Considere usar variáveis de ambiente para senhas sensíveis

3. **Use .gitignore**
   - Se você personalizar o arquivo com senhas reais, adicione ao `.gitignore`:
   ```
   src/config/defaultUsers.json
   ```

4. **Bcrypt**
   - As senhas são automaticamente hasheadas com bcrypt (10 rounds)
   - Nunca são armazenadas em texto plano no banco de dados

## Exemplos de Uso

### Criar Apenas Administrador
```json
[
  {
    "username": "admin",
    "password": "sua_senha_forte_aqui",
    "email": "admin@seudominio.com",
    "permission": 4
  }
]
```

### Criar Equipe Completa
```json
[
  {
    "username": "admin",
    "password": "senha_admin",
    "email": "admin@game.com",
    "permission": 4
  },
  {
    "username": "gm1",
    "password": "senha_gm",
    "email": "gm1@game.com",
    "permission": 3
  },
  {
    "username": "gm2",
    "password": "senha_gm",
    "email": "gm2@game.com",
    "permission": 3
  },
  {
    "username": "cm",
    "password": "senha_cm",
    "email": "cm@game.com",
    "permission": 2
  },
  {
    "username": "tester",
    "password": "senha_teste",
    "email": "tester@game.com",
    "permission": 1
  }
]
```

## Troubleshooting

### Usuário não foi criado
- Verifique os logs do servidor para mensagens de erro
- Confirme que o arquivo `defaultUsers.json` está bem formatado (JSON válido)
- Verifique se o MongoDB está rodando e acessível

### Erro "Username already exists"
- Isto é esperado se o usuário já existe
- O sistema irá apenas atualizar a permissão se necessário
- Para recriar, delete o usuário do banco primeiro

### Senha não funciona
- Lembre-se: se você alterou a senha no JSON após o usuário já ter sido criado, precisa deletar o usuário do banco para ele ser recriado
- As senhas só são hasheadas na criação, não na atualização

### Arquivo defaultUsers.json não encontrado
- O servidor irá registrar um warning mas continuará funcionando
- Verifique se o arquivo está em `src/config/defaultUsers.json`
- O caminho é relativo ao local onde o módulo `defaultUsersService.js` está

## Compatibilidade

Este sistema é compatível com:
- Node.js 22+
- MongoDB 4.0+
- Sistema de permissões existente (`src/constants/permissions.js`)
- Sistema de autenticação existente (`src/services/authService.js`)
