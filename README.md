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

## Requisitos
- Ubuntu 24.04
- Node.js 22+ (use `nvm` ou `sudo apt install nodejs npm` desde que seja Node 22)
- MongoDB (community) em `localhost:27017` (ou ajuste a URI no .env)
- Porta WS default: 8080 (o client, na segunda tentativa, usa `ws://host:8080`; para WSS, use proxy TLS)

## Instalação
```bash
git clone <seu-repo> ml-compatible-server
cd ml-compatible-server
cp .env.example .env
nano .env  # ajuste URI do Mongo, portas, etc.
npm install
npm start
```

## Testes
Execute os testes automatizados para verificar a implementação de água profunda:
```bash
node test-deep-water.js
```

## Documentação Adicional
- `DEEP_WATER_IMPLEMENTATION.md` - Detalhes técnicos da implementação de água
- `IMPLEMENTATION_SUMMARY.md` - Resumo completo das mudanças
- `MANUAL_TESTING_GUIDE.md` - Guia para verificação manual com cliente