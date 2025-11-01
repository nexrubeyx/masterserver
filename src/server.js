/**
 * Arquivo principal do servidor - Ponto de entrada da aplicação
 * 
 * Este arquivo é responsável por:
 * - Inicializar todas as configurações e dependências do sistema
 * - Conectar ao banco de dados MongoDB
 * - Criar e iniciar o servidor WebSocket (WS ou WSS com TLS)
 * - Configurar redirecionamento HTTP para HTTPS (opcional)
 * - Gerenciar o ciclo de vida do servidor e tratamento de sinais de encerramento
 */

import { loadEnv } from './config/env.js';
import { connectMongo } from './db/mongo.js';
import { createLogger } from './logger.js';
import { createWSServer } from './network/websocket.js';
import { World } from './state/world.js';
import http from 'http';
import https from 'https';
import { loadTLSCredentials } from './config/tls.js';
import { initializeDefaultUsers } from './services/defaultUsersService.js';

/**
 * Função principal que inicializa todo o servidor
 * 
 * Fluxo de inicialização:
 * 1. Carrega variáveis de ambiente (.env)
 * 2. Cria o sistema de logging
 * 3. Conecta ao MongoDB e configura índices
 * 4. Inicializa usuários padrão (admin, tester, etc) se não existirem
 * 5. Cria o objeto World que gerencia todos os jogadores e mapas
 * 6. Configura servidor HTTPS/WSS se TLS estiver habilitado
 * 7. Cria servidor WebSocket para comunicação com clientes
 * 8. Configura redirecionamento HTTP -> HTTPS (opcional)
 * 9. Registra handlers para encerramento gracioso do servidor
 */
async function main() {
  // Carrega todas as variáveis de ambiente do arquivo .env
  const env = loadEnv();
  
  // Cria o logger para registrar eventos do sistema
  const logger = createLogger();

  // Conecta ao banco de dados MongoDB
  await connectMongo(env, logger);

  // Inicializa usuários padrão (admin, tester, etc) se não existirem
  await initializeDefaultUsers(env, logger);

  // Cria o objeto World que gerencia todo o estado do jogo (jogadores, mapas, etc)
  const world = new World(env, logger);
  await world.init();

  // Servidor HTTPS (usado apenas quando TLS está habilitado)
  let httpsServer = null;

  // Verifica se TLS/SSL está habilitado nas configurações
  if (env.TLS_ENABLE) {
    // Carrega os certificados SSL do sistema de arquivos
    const creds = loadTLSCredentials(env, logger);
    
    // Cria servidor HTTPS com os certificados carregados
    httpsServer = https.createServer({
      key: creds.key,      // Chave privada SSL
      cert: creds.cert     // Certificado SSL
      // Se quiser SNI ou múltiplos domínios, aqui dá para usar SNICallback com tls.createSecureContext
    });

    // Endpoint de health check para monitoramento do servidor
    httpsServer.on('request', (req, res) => {
      if (req.url === '/health') {
        // Responde 'ok' para verificações de saúde
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end('ok');
      } else {
        // Para WSS não precisa servir conteúdo; o upgrade é tratado pelo ws.
        res.writeHead(404, { 'content-type': 'text/plain' });
        res.end('Not Found');
      }
    });

    // Inicia o servidor HTTPS na porta configurada
    httpsServer.listen(env.TLS_PORT, env.SERVER_HOST, () => {
      logger.info({ host: env.SERVER_HOST, port: env.TLS_PORT }, 'HTTPS/WSS (TLS) iniciado');
    });

    // Anexa o servidor WebSocket Seguro (WSS) ao servidor HTTPS
    createWSServer(env, logger, world, httpsServer);
  } else {
    // Modo WS sem TLS - cria servidor WebSocket simples (não seguro)
    createWSServer(env, logger, world);
  }

  // Servidor de redirecionamento HTTP -> HTTPS (opcional)
  let httpRedirectServer = null;
  
  // Se redirecionamento HTTP está habilitado E TLS está ativo
  if (env.HTTP_REDIRECT_ENABLE && env.TLS_ENABLE) {
    // Cria servidor HTTP que redireciona todas as requisições para HTTPS
    httpRedirectServer = http.createServer((req, res) => {
      const host = req.headers.host || '';
      const location = `https://${host}${req.url || '/'}`;
      // Envia código 301 (Moved Permanently) para redirecionar para HTTPS
      res.writeHead(301, { Location: location });
      res.end();
    });
    
    // Inicia o servidor de redirecionamento na porta HTTP padrão
    httpRedirectServer.listen(env.HTTP_REDIRECT_PORT, env.SERVER_HOST, () => {
      logger.info({ host: env.SERVER_HOST, port: env.HTTP_REDIRECT_PORT }, 'HTTP redirect ativo');
    });
  }

  // Trata sinal SIGINT (Ctrl+C) para encerramento gracioso
  process.on('SIGINT', async () => {
    logger.info('Encerrando servidor (SIGINT)...');
    // Tenta fechar o servidor HTTPS se existir
    try { httpsServer?.close(); } catch {}
    // Tenta fechar o servidor de redirecionamento se existir
    try { httpRedirectServer?.close(); } catch {}
    // Desliga o World, salvando estado dos jogadores
    await world.shutdown();
    process.exit(0);
  });

  // Trata sinal SIGTERM (encerramento pelo sistema) para encerramento gracioso
  process.on('SIGTERM', async () => {
    logger.info('Encerrando servidor (SIGTERM)...');
    // Tenta fechar o servidor HTTPS se existir
    try { httpsServer?.close(); } catch {}
    // Tenta fechar o servidor de redirecionamento se existir
    try { httpRedirectServer?.close(); } catch {}
    // Desliga o World, salvando estado dos jogadores
    await world.shutdown();
    process.exit(0);
  });
}

// Executa a função principal e captura erros fatais
main().catch((err) => {
  console.error('Erro fatal ao iniciar:', err);
  process.exit(1);
});