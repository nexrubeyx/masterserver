import templates from "../models/objectTemplates.js";

// Armazena templates adicionais carregados de mapas
let additionalTemplates = [];

/**
 * Registra templates adicionais (ex: de arquivos de mapa)
 * 
 * @param {Array} newTemplates - Array de templates para adicionar
 */
export function registerTemplates(newTemplates) {
  if (!Array.isArray(newTemplates)) return;
  
  // Evita duplicatas - só adiciona se não existir em templates estáticos ou adicionais
  for (const newTpl of newTemplates) {
    if (!newTpl.tpl) continue;
    
    // Verifica se já existe nos templates estáticos
    const existsInStatic = templates.find(t => t.tpl === newTpl.tpl);
    if (existsInStatic) {
      // Template já existe estaticamente, ignora
      continue;
    }
    
    // Remove template existente com mesmo ID nos adicionais (para permitir atualizações)
    const idx = additionalTemplates.findIndex(t => t.tpl === newTpl.tpl);
    if (idx >= 0) {
      additionalTemplates.splice(idx, 1);
    }
    
    additionalTemplates.push(newTpl);
  }
}

/**
 * Obtém todos os templates (estáticos + dinâmicos)
 * 
 * @returns {Array} Array com todos os templates
 */
export function getAllTemplates() {
  return [...templates, ...additionalTemplates];
}

/**
 * Envia um template para o cliente
 * 
 * @param {WebSocket} ws - Conexão WebSocket do cliente
 * @param {Object} t - Template a enviar
 */
export function sendTemplate(ws, t) {
  ws.send(JSON.stringify({
    type: "obj_tpl",
    tpl: t.tpl,
    name: t.name,
    desc: t.desc,
    stack: t.stack ? 1 : 0,
    pickup: t.pickup ? 1 : 0,
    block: t.block ? 1 : 0,
    spr: t.spr,
    build: t.build || ""
  }));
}

/**
 * Envia todos os templates para o cliente
 * 
 * @param {WebSocket} ws - Conexão WebSocket do cliente
 */
export function sendAllTemplates(ws) {
  const allTemplates = getAllTemplates();
  for (const t of allTemplates) sendTemplate(ws, t);
}

/**
 * Busca um template por ID
 * 
 * @param {string} tpl - ID do template
 * @returns {Object|undefined} Template encontrado ou undefined
 */
export function findTemplate(tpl) {
  const allTemplates = getAllTemplates();
  return allTemplates.find(t => t.tpl === tpl);
}

export { templates };