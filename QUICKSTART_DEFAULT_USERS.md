# Guia Rápido - Sistema de Usuários Padrão

## O Que Foi Implementado

Foi adicionado um sistema que cria automaticamente usuários padrão (admin, tester, etc.) quando o servidor inicia, caso eles não existam no banco de dados.

## Como Funciona

1. Ao iniciar o servidor (`npm start`), o sistema lê o arquivo `src/config/defaultUsers.json`
2. Para cada usuário definido no JSON:
   - Verifica se o usuário já existe no banco
   - Se não existir, cria o usuário com senha hasheada (bcrypt) e permissão configurada
   - Cria automaticamente um personagem para o usuário
   - Se já existir, apenas atualiza a permissão se necessário

## Configuração Rápida

### Passo 1: Editar Senhas
Edite o arquivo `src/config/defaultUsers.json`:
```json
[
  {
    "username": "admin",
    "password": "SUA_SENHA_FORTE_AQUI",
    "email": "admin@seudominio.com",
    "permission": 4
  },
  {
    "username": "tester",
    "password": "senha_teste",
    "email": "tester@seudominio.com",
    "permission": 1
  }
]
```

### Passo 2: Iniciar Servidor
```bash
npm start
```

### Passo 3: Verificar Logs
Você verá logs como:
```
[INFO] Verificando 2 usuários padrão...
[INFO] Criando usuário padrão... (username: "admin", permission: 4)
[INFO] Usuário padrão criado com sucesso
```

## Níveis de Permissão

- `1` = PLAYER (jogador normal)
- `2` = CM (Community Manager)
- `3` = GM (Game Master)
- `4` = MASTER (Administrador máximo)

## Adicionar Mais Usuários

Simplesmente adicione mais objetos ao array no JSON:
```json
[
  {
    "username": "admin",
    "password": "senha1",
    "email": "admin@game.com",
    "permission": 4
  },
  {
    "username": "gm1",
    "password": "senha2",
    "email": "gm1@game.com",
    "permission": 3
  },
  {
    "username": "gm2",
    "password": "senha3",
    "email": "gm2@game.com",
    "permission": 3
  }
]
```

## Testar

Execute o script de teste:
```bash
node test-default-users.js
```

## Documentação Completa

Veja `DEFAULT_USERS_DOCUMENTATION.md` para documentação completa incluindo:
- Detalhes técnicos da implementação
- Guia de segurança
- Troubleshooting
- Exemplos avançados

## Arquivos do Sistema

- `src/config/defaultUsers.json` - Configuração dos usuários
- `src/services/defaultUsersService.js` - Lógica de inicialização
- `src/server.js` - Integração na inicialização do servidor
- `DEFAULT_USERS_DOCUMENTATION.md` - Documentação completa
- `test-default-users.js` - Teste automatizado
