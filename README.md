# ML Compatible Server (Node.js + MongoDB, JS puro)

Servidor 100% em JavaScript (Node 22), compatível com o client fornecido, sem Docker, com MongoDB. 
Implementa autenticação (login/guest), mapa em JSON com vizinhos (transição automática), movimento, chat, inventário (estrutural) e protocolo de mensagens compatível.

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