# ML Compatible Server (Node.js + MongoDB, JS puro)

Servidor 100% em JavaScript (Node 22), compatível com o client fornecido, sem Docker, com MongoDB. 
Implementa autenticação (login/guest), mapa em JSON com vizinhos (transição automática), movimento, chat, inventário (estrutural) e protocolo de mensagens compatível.

## Características
- **Autenticação**: Login com credenciais ou guest mode
- **Mapas JSON**: Mapas editáveis em formato JSON com versionamento
- **Templates de Objetos**: Sistema de templates dinâmico com suporte a templates por mapa
- **Colocação de Objetos**: Sistema de objectPlacements para popular mapas com objetos estáticos em coordenadas específicas
- **Movimento tile-by-tile**: Sistema de movimento fluido com validação
- **Sistema de Segurança**: Validação de coordenadas e chunks para prevenir exploits
  - Prevenção de teleportação (jogadores devem seguir caminhos A→B→C)
  - Validação de limites de mapa
  - Validação de chunks (integridade de dados)
  - Detecção de movimentos anômalos
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
Execute os testes automatizados:
```bash
# Testar implementação de água profunda
node test-deep-water.js

# Testar funcionalidade de objectPlacements
node test-object-placements.js

# Testar sistema de segurança (validação de movimento e chunks)
node test-security.js
```

## Documentação Adicional
- `TEMPLATES_DOCUMENTATION.md` - Sistema completo de templates de objetos
- `DEEP_WATER_IMPLEMENTATION.md` - Detalhes técnicos da implementação de água
- `SECURITY_DOCUMENTATION.md` - Sistema de segurança e validação de movimentos/chunks
- `IMPLEMENTATION_SUMMARY.md` - Resumo completo das mudanças
- `MANUAL_TESTING_GUIDE.md` - Guia para verificação manual com cliente