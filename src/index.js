/**
 * Main Entry Point - Servidor WebSocket com Templates e Objetos
 * 
 * Este servidor implementa:
 * - Carregamento de templates com hot-reload (config/templates/*.json)
 * - Carregamento de mapas com objetos com hot-reload (maps/*.json)
 * - Servidor WebSocket que envia obj_tpl e o para clientes
 * - Suporte opcional para client build (bld) via ALLOW_CLIENT_BUILD
 */

import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { createLogger } from './logger.js';
import { TemplateRegistry } from './templates/registry.js';
import { MapLoader } from './maps/loader.js';
import { ObjectOverlay } from './maps/overlay.js';
import { sendTemplates, sendObjects, broadcastTemplates, broadcastObjects } from './protocol/send.js';

// Carrega variáveis de ambiente
dotenv.config();

/**
 * Função principal
 */
async function main() {
  // Configurações do ambiente
  const env = {
    WS_PORT: parseInt(process.env.WS_PORT || '8080', 10),
    MAP_FILE: process.env.MAP_FILE || 'maps/mundo1.json',
    TEMPLATES_DIR: process.env.TEMPLATES_DIR || 'config/templates',
    INIT_VIEW_W: parseInt(process.env.INIT_VIEW_W || '15', 10),
    INIT_VIEW_H: parseInt(process.env.INIT_VIEW_H || '15', 10),
    ALLOW_CLIENT_BUILD: process.env.ALLOW_CLIENT_BUILD === 'true'
  };

  // Cria logger
  const logger = createLogger();

  logger.info({ config: env }, 'Starting server');

  // Inicializa template registry
  const templateRegistry = new TemplateRegistry(env.TEMPLATES_DIR, logger);
  await templateRegistry.init();

  // Inicializa map loader
  const mapLoader = new MapLoader(env.MAP_FILE, logger);
  await mapLoader.init();

  // Inicializa object overlay
  const objectOverlay = new ObjectOverlay(logger);
  objectOverlay.init(mapLoader.getMapData());

  // Cria servidor WebSocket
  const wss = new WebSocketServer({
    port: env.WS_PORT,
    maxPayload: 1024 * 1024 // 1MB
  });

  logger.info({ port: env.WS_PORT }, 'WebSocket server started');

  // Handler de conexão de clientes
  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    logger.info({ ip }, 'Client connected');

    // Envia catálogo de templates logo após conexão
    const templates = templateRegistry.getAllTemplates();
    sendTemplates(ws, templates);

    // Envia objetos do retângulo inicial (viewport)
    const mapData = mapLoader.getMapData();
    const centerX = Math.floor(mapData.width / 2);
    const centerY = Math.floor(mapData.height / 2);
    const startX = Math.max(0, centerX - Math.floor(env.INIT_VIEW_W / 2));
    const startY = Math.max(0, centerY - Math.floor(env.INIT_VIEW_H / 2));
    
    const initialObjects = objectOverlay.getObjectsInRect(
      startX, 
      startY, 
      env.INIT_VIEW_W, 
      env.INIT_VIEW_H
    );
    
    if (initialObjects.length > 0) {
      sendObjects(ws, initialObjects);
    }

    // Handler de mensagens do cliente
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        
        // Suporte para client build (bld)
        if (msg.type === 'bld' && env.ALLOW_CLIENT_BUILD) {
          const { tpl, x, y } = msg;
          
          if (tpl && typeof x === 'number' && typeof y === 'number') {
            // Valida se template existe
            if (templateRegistry.getTemplate(tpl)) {
              // Adiciona objeto em memória
              objectOverlay.addObjectAt(x, y, tpl);
              
              // Broadcast para todos os clientes
              broadcastObjects(wss, [{ x, y, d: objectOverlay.getObjectsAt(x, y).join('|') }]);
              
              logger.info({ tpl, x, y }, 'Client build applied (in-memory only)');
            } else {
              logger.warn({ tpl }, 'Client build failed: template not found');
            }
          }
        }
      } catch (err) {
        logger.error({ err }, 'Error processing client message');
      }
    });

    ws.on('close', () => {
      logger.info({ ip }, 'Client disconnected');
    });

    ws.on('error', (err) => {
      logger.error({ err, ip }, 'WebSocket error');
    });
  });

  // Hot-reload: quando templates mudam, reenvia para todos
  templateRegistry.onChange((templates) => {
    logger.info({ count: templates.length }, 'Templates updated, broadcasting to clients');
    broadcastTemplates(wss, templates);
  });

  // Hot-reload: quando mapa muda, reenvia tiles afetados
  mapLoader.onChange((oldObjects, newObjects, mapData) => {
    logger.info('Map updated, rebuilding overlay and broadcasting changes');
    
    // Reconstrói overlay
    objectOverlay.init(mapData);
    
    // Identifica tiles que mudaram
    const changedTiles = objectOverlay.getChangedTiles(oldObjects, newObjects);
    
    if (changedTiles.length > 0) {
      // Coleta objetos dos tiles mudados
      const tiles = changedTiles.map(({ x, y }) => ({
        x,
        y,
        d: objectOverlay.getObjectsAt(x, y).join('|')
      })).filter(t => t.d); // Remove tiles sem objetos
      
      // Broadcast para todos os clientes
      broadcastObjects(wss, changedTiles.map(({ x, y }) => {
        const objects = objectOverlay.getObjectsAt(x, y);
        return { x, y, d: objects.length > 0 ? objects.join('|') : '' };
      }));
      
      logger.info({ tiles: changedTiles.length }, 'Map changes broadcasted');
    }
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down server...');
    
    wss.clients.forEach(client => client.close());
    wss.close();
    
    await templateRegistry.shutdown();
    await mapLoader.shutdown();
    
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Executa função principal
main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
