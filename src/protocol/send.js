/**
 * Protocol Send Helpers - Funções auxiliares para enviar mensagens específicas
 * 
 * Este módulo fornece helpers para construir e enviar mensagens padronizadas
 * do protocolo do cliente.
 */

/**
 * Cria uma mensagem obj_tpl (catálogo de templates)
 * 
 * @param {Array} templates - Array de templates
 * @returns {Object} Mensagem obj_tpl
 * 
 * Formato:
 * {
 *   type: 'obj_tpl',
 *   tpls: [
 *     { tpl: 'torch', name: 'Tocha', desc: '...', ... }
 *   ]
 * }
 */
export function makeObjectTemplateMessage(templates) {
  return {
    type: 'obj_tpl',
    tpls: templates
  };
}

/**
 * Cria uma mensagem 'o' (objetos por tile)
 * 
 * @param {Array} tiles - Array de tiles com objetos
 * @returns {Object} Mensagem 'o'
 * 
 * Formato:
 * {
 *   type: 'o',
 *   tiles: [
 *     { x: 10, y: 5, d: 'torch|chest' }
 *   ]
 * }
 */
export function makeObjectsMessage(tiles) {
  return {
    type: 'o',
    tiles: tiles
  };
}

/**
 * Envia catálogo de templates para um cliente
 */
export function sendTemplates(ws, templates) {
  const msg = makeObjectTemplateMessage(templates);
  
  if (ws.readyState === 1) { // WebSocket.OPEN
    ws.send(JSON.stringify(msg));
  }
}

/**
 * Envia objetos de tiles específicos para um cliente
 */
export function sendObjects(ws, tiles) {
  const msg = makeObjectsMessage(tiles);
  
  if (ws.readyState === 1) { // WebSocket.OPEN
    ws.send(JSON.stringify(msg));
  }
}

/**
 * Broadcast de templates para todos os clientes conectados
 */
export function broadcastTemplates(wss, templates) {
  const msg = JSON.stringify(makeObjectTemplateMessage(templates));
  
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(msg);
    }
  });
}

/**
 * Broadcast de objetos para todos os clientes conectados
 */
export function broadcastObjects(wss, tiles) {
  const msg = JSON.stringify(makeObjectsMessage(tiles));
  
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(msg);
    }
  });
}
