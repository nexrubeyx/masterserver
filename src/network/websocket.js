/**
 * Servidor WebSocket - Gerenciamento de Conexões dos Clientes
 * 
 * Este módulo cria e configura o servidor WebSocket que gerencia todas as conexões
 * dos clientes do jogo. Ele lida com:
 * - Estabelecimento de conexões WebSocket (WS ou WSS)
 * - Rate limiting (limitação de taxa) para prevenir spam
 * - Validação de mensagens recebidas
 * - Heartbeats (ping/pong) para detectar desconexões
 * - Roteamento de mensagens para os handlers apropriados
 * 
 * Protocolo:
 * - Mensagens trocadas em formato JSON
 * - Cliente envia comandos (login, movement, chat, etc)
 * - Servidor responde com atualizações de estado
 */

import { WebSocketServer } from 'ws';
import { validatePacket } from '../protocol/schema.js';
import { createMessageRouter } from '../controllers/messageRouter.js';

// === IMPORTAÇÕES PARA OBJETOS SOBRE TILES ===
import { sendAllTemplates, findTemplate } from '../services/templateService.js';
import { ObjectLayer } from '../state/objectLayer.js';

/**
 * Cria e configura o servidor WebSocket
 * 
 * @param {Object} env - Configurações do ambiente
 * @param {Object} logger - Instância do logger
 * @param {Object} world - Instância do World que gerencia o estado do jogo
 * @param {Object} [attachToServer] - Servidor HTTPS opcional para anexar WSS
 * @returns {WebSocketServer} Instância do servidor WebSocket configurado
 * 
 * Modos de operação:
 * - Se attachToServer for fornecido: cria WSS anexado ao servidor HTTPS
 * - Caso contrário: cria servidor WS standalone na porta configurada
 */
export function createWSServer(env, logger, world, attachToServer /* optional httpsServer */) {
  let wss;
  
  if (attachToServer) {
    // Modo WSS: anexa ao servidor HTTPS existente
    wss = new WebSocketServer({
      server: attachToServer,                  // Servidor HTTPS para anexar
      maxPayload: env.MAX_PAYLOAD_BYTES        // Tamanho máximo de mensagem
    });
    logger.info({ port: env.TLS_PORT }, 'WSS anexado ao HTTPS server');
  } else {
    // Modo WS: cria servidor standalone
    wss = new WebSocketServer({
      host: env.SERVER_HOST,                   // Host/IP para escutar
      port: env.SERVER_PORT_WS,                // Porta WebSocket
      maxPayload: env.MAX_PAYLOAD_BYTES        // Tamanho máximo de mensagem
    });
    logger.info({ host: env.SERVER_HOST, port: env.SERVER_PORT_WS }, 'WS Server iniciado');
  }

  // Cria o roteador que processa mensagens dos clientes
  const router = createMessageRouter(env, logger, world);
  
  // === CAMADA DE OBJETOS SOBRE TILES (memória) ===
  const objectLayer = new ObjectLayer();

  // Helper: obter player do ws/world
  function getPlayerFromWs(ws) {
    return ws.player || ws._player || (typeof world?.getPlayer === 'function' ? world.getPlayer(ws) : null);
  }

  // Helper: broadcast "o" para todos (ajuste escopo conforme mundo/visão)
  function broadcastTileObjects(x, y, dString) {
    const payload = JSON.stringify({ type: "o", x, y, d: dString });
    wss.clients.forEach((client) => {
      if (client && client.readyState === 1 /* OPEN */) {
        try { client.send(payload); } catch {}
      }
    });
  }
  
  // Configurações de rate limiting (anti-spam)
  const rateWindow = env.RATE_LIMIT_WINDOW_MS;  // Janela de tempo (10 segundos)
  const rateMax = env.RATE_LIMIT_MAX;            // Máximo de mensagens na janela (200)

  /**
   * Handler executado quando um novo cliente se conecta
   * 
   * Inicializa estado específico da conexão:
   * - _ip: endereço IP do cliente
   * - _rate: array para controlar taxa de mensagens
   * - _alive: flag para heartbeat
   */
  wss.on('connection', (ws, req) => {
    // Armazena o IP do cliente para logging e rate limiting
    ws._ip = req.socket.remoteAddress;
    
    // Array de timestamps para controlar rate limiting
    ws._rate = [];
    
    // Flag para heartbeat (ping/pong)
    ws._alive = true;

    // === Envia todos os templates ao cliente no momento da conexão ===
    // Isso garante que o client tenha o dicionário (object_dict) antes de receber 'o'.
    

    /**
     * Handler executado quando uma mensagem é recebida do cliente
     * 
     * Fluxo de processamento:
     * 1. Verifica rate limiting
     * 2. Valida JSON
     * 3. Valida estrutura da mensagem (schema)
     * 4. Handlers de objetos (bld/setobj/clrobj)
     * 5. Roteia para o handler apropriado
     */
    ws.on('message', (buf) => {
      // === RATE LIMITING ===
      const now = Date.now();
      
      // Remove timestamps antigos fora da janela de tempo
      ws._rate = ws._rate.filter((t) => now - t < rateWindow);
      
      // Adiciona timestamp da mensagem atual
      ws._rate.push(now);
      
      // Se excedeu o limite, fecha a conexão
      if (ws._rate.length > rateMax) {
        ws.close(1008, 'Rate limit');
        return;
      }

      // === VALIDAÇÃO DE JSON ===
      let data = null;
      try {
        // Verifica tamanho do payload
        if (buf.length > env.MAX_PAYLOAD_BYTES) throw new Error('Payload too large');
        
        // Converte buffer para string e parseia JSON
        data = JSON.parse(buf.toString('utf8'));
      } catch {
        // JSON inválido - fecha conexão
        ws.close(1003, 'Invalid JSON');
        return;
      }

      // === VALIDAÇÃO DE SCHEMA ===
      // Observação: certifique-se de que o schema aceite os tipos 'bld', 'setobj', 'clrobj'.
      const v = validatePacket(data);
      if (!v.ok) return; // Mensagem inválida, ignora

      // === HANDLERS DE OBJETOS SOBRE TILES ===
      // {type:"bld", tpl} -> constrói no tile do player e emite {type:"o"}
      if (data.type === 'bld' && typeof data.tpl === 'string') {
        const tpl = findTemplate(data.tpl);
        if (!tpl) return;
        const player = getPlayerFromWs(ws);
        if (!player || typeof player.x !== 'number' || typeof player.y !== 'number') return;

        const list = objectLayer.add(player.x, player.y, tpl.tpl);
        broadcastTileObjects(player.x, player.y, list.join('|'));
        return;
      }

      // {type:"setobj", x, y, list:[tpl,...]} -> define lista exata e emite {type:"o"}
      if (data.type === 'setobj' && Number.isInteger(data.x) && Number.isInteger(data.y) && Array.isArray(data.list)) {
        // (opcional) validar permissões de admin aqui
        const valids = data.list.filter(t => !!findTemplate(t));
        objectLayer.set(data.x, data.y, valids);
        broadcastTileObjects(data.x, data.y, valids.join('|'));
        return;
      }

      // {type:"clrobj", x, y} -> limpa tile e emite {type:"o"} com d:""
      if (data.type === 'clrobj' && Number.isInteger(data.x) && Number.isInteger(data.y)) {
        objectLayer.clear(data.x, data.y);
        broadcastTileObjects(data.x, data.y, "");
        return;
      }

      // === ROTEAMENTO ===
      router(ws, data).catch((err) => {
        logger.warn(
          {
            err: err?.message || String(err),
            stack: err?.stack,
            packet: data
          },
          'Erro no roteador'
        );
      });
    });

    /**
     * Handler de pong - resposta ao ping do servidor
     * Marca a conexão como viva
     */
    ws.on('pong', () => { ws._alive = true; });
    
    /**
     * Handler de desconexão - limpa estado do jogador
     */
    ws.on('close', () => { world.handleDisconnect(ws); });
  });

  /**
   * Heartbeat interval - Verifica conexões ativas
   * 
   * A cada 15 segundos:
   * - Termina conexões que não responderam ao ping anterior
   * - Envia novo ping para todas as conexões ativas
   * 
   * Isso detecta clientes que perderam conexão sem fechar o socket.
   */
  const iv = setInterval(() => {
    wss.clients.forEach((ws) => {
      // Se não respondeu ao último ping, termina conexão
      if (ws._alive === false) {
        ws.terminate();
        return;
      }
      
      // Marca como "não viva" e envia ping
      // Se responder com pong, será marcada como viva novamente
      ws._alive = false;
      try { ws.ping(); } catch {}
    });
  }, 15000); // 15 segundos

  // Limpa interval quando o servidor WSS é fechado
  wss.on('close', () => clearInterval(iv));
  
  return wss;
}