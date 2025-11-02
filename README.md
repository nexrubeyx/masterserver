# ML Compatible Server (Node.js + MongoDB, JS puro)

Servidor 100% em JavaScript (Node 22), compatível com o client fornecido, sem Docker, com MongoDB. 
Implementa autenticação (login/guest), mapa em JSON com vizinhos (transição automática), movimento, chat, inventário (estrutural) e protocolo de mensagens compatível.

## Características
- **Autenticação**: Login com credenciais ou guest mode
- **Mapas JSON**: Mapas editáveis em formato JSON com versionamento
- **Movimento tile-by-tile**: Sistema de movimento fluido com validação
- **Chat**: Sistema de mensagens entre jogadores
- **Água Profunda**: Sistema completo de água com animação e colisão (tiles 36, 248, 325)
- **Edge Blending**: Perfeita paridade com renderização do cliente
- **Inventário**: Estrutura básica de inventário (extensível)
- **Templates de Objetos**: Sistema de templates com hot-reload automático
- **Objetos no Mapa**: Suporte para objetos dinâmicos com hot-reload
- **Client Build**: Suporte opcional para construção de objetos pelo cliente

## Requisitos
- Ubuntu 24.04
- Node.js 22+ (use `nvm` ou `sudo apt install nodejs npm` desde que seja Node 22)
- MongoDB (community) em `localhost:27017` (ou ajuste a URI no .env) - **apenas para modo full**
- Porta WS default: 8080 (o client, na segunda tentativa, usa `ws://host:8080`; para WSS, use proxy TLS)

## Modos de Operação

### Modo Simplificado (Templates e Objetos)
Servidor WebSocket leve focado em templates de objetos e mapas com hot-reload:
```bash
npm install
npm start       # Produção
npm run dev     # Development com watch
```

### Modo Completo (MongoDB + Autenticação)
Servidor completo com autenticação, MongoDB e todas as funcionalidades:
```bash
cp .env.example .env
nano .env  # ajuste URI do Mongo, portas, etc.
npm install
npm run start:full    # Produção
npm run dev:full      # Development com watch
```

## Testes
Execute os testes automatizados para verificar a implementação de água profunda:
```bash
node test-deep-water.js
```

## Sistema de Templates e Objetos

### Templates
Templates são armazenados em `config/templates/*.json` e são carregados automaticamente com hot-reload.

**Formatos suportados:**
```json
// Objeto único
{
  "tpl": "torch",
  "name": "Tocha",
  "desc": "Ilumina a área",
  "stack": false,
  "pickup": true,
  "block": false,
  "spr": 456,
  "build": "456f,t|ffaa00|,q|0.9|"
}

// Array de templates
[
  { "tpl": "torch", "name": "Tocha", ... },
  { "tpl": "chest", "name": "Baú", ... }
]

// Objeto chaveado
{
  "torch": { "tpl": "torch", "name": "Tocha", ... },
  "chest": { "tpl": "chest", "name": "Baú", ... }
}
```

### Mapas com Objetos
Mapas são armazenados em `maps/*.json` e contêm apenas a lista de objetos com hot-reload:

```json
{
  "id": "caverealm",
  "version": 14,
  "title": "Custom Map",
  "width": 15,
  "height": 15,
  "tiles": [...],
  "objects": [
    { "x": 10, "y": 5, "d": "torch|chest" },
    { "x": 13, "y": 8, "d": "door_closed" }
  ]
}
```

O campo `d` pode conter um ou mais templates separados por `|`.

### Variáveis de Ambiente
- `WS_PORT` - Porta do servidor WebSocket (default: 8080)
- `MAP_FILE` - Caminho do arquivo de mapa (default: `maps/mundo1.json`)
- `TEMPLATES_DIR` - Diretório de templates (default: `config/templates`)
- `INIT_VIEW_W` - Largura inicial da viewport (default: 15)
- `INIT_VIEW_H` - Altura inicial da viewport (default: 15)
- `ALLOW_CLIENT_BUILD` - Permite client build via `bld` (default: false)

### Client Build
Quando `ALLOW_CLIENT_BUILD=true`, o servidor aceita mensagens do tipo:
```json
{
  "type": "bld",
  "tpl": "torch",
  "x": 10,
  "y": 5
}
```

**Nota:** Objetos construídos pelo cliente são aplicados apenas em memória e não são persistidos.

### Protocolo WebSocket
O servidor envia:
- `obj_tpl` - Catálogo de templates (enviado na conexão e quando templates mudam)
- `o` - Objetos por tile (enviado na conexão inicial e quando o mapa muda)

```json
// obj_tpl
{
  "type": "obj_tpl",
  "tpls": [
    { "tpl": "torch", "name": "Tocha", ... }
  ]
}

// o
{
  "type": "o",
  "tiles": [
    { "x": 10, "y": 5, "d": "torch|chest" }
  ]
}
```

## Documentação Adicional
- `DEEP_WATER_IMPLEMENTATION.md` - Detalhes técnicos da implementação de água
- `IMPLEMENTATION_SUMMARY.md` - Resumo completo das mudanças
- `MANUAL_TESTING_GUIDE.md` - Guia para verificação manual com cliente