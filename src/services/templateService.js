import templates from "../models/objectTemplates.js";

// Armazena templates adicionais carregados de mapas
let additionalTemplates = [];

/**
 * Registra templates adicionais (ex: de arquivos de mapa)
 * 
 * @param {Array} newTemplates - Array de templates para adicionar
 */
export function registerTemplates(newTemplates) {
  if (!Array.isArray(newTemplates)) {
    console.warn('registerTemplates: Input deve ser um array, recebido:', typeof newTemplates);
    return;
  }
  
  // Evita duplicatas - só adiciona se não existir em templates estáticos ou adicionais
  for (const newTpl of newTemplates) {
    // Validação básica de campos obrigatórios
    // Aceita tanto strings quanto números para tpl (consistente com findTemplate)
    if (!newTpl.tpl || (typeof newTpl.tpl !== 'string' && typeof newTpl.tpl !== 'number')) {
      console.warn('registerTemplates: Template sem ID válido ignorado:', newTpl);
      continue;
    }
    
    if (!newTpl.name || typeof newTpl.spr !== 'number') {
      console.warn(`registerTemplates: Template "${newTpl.tpl}" está incompleto (falta name ou spr)`, newTpl);
      continue;
    }
    
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
 * Cria um pacote de template (sem enviar)
 * 
 * @param {Object} t - Template
 * @returns {Object} Pacote obj_tpl
 */
export function makeTemplatePacket(t) {
  const packet = {
    type: "obj_tpl",
    tpl: t.tpl,
    name: t.name,
    spr: t.spr,
    stack: Number(!!t.stack),
    pickup: Number(!!t.pickup),
    block: Number(!!t.block)
  };
  
  // Only include build if it has a value
  if (t.build) {
    packet.build = t.build;
  }
  
  return packet;
}

/**
 * Envia um template para o cliente
 * 
 * @param {WebSocket} ws - Conexão WebSocket do cliente
 * @param {Object} t - Template a enviar
 */
export function sendTemplate(ws, t) {
  const packet = makeTemplatePacket(t);
  ws.send(JSON.stringify(packet));
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
 * @param {string|number} tpl - ID do template (aceita string ou número)
 * @returns {Object|undefined} Template encontrado ou undefined
 */
export function findTemplate(tpl) {
  const allTemplates = getAllTemplates();
  // Usa loose equality (==) para comparar, permitindo "1" == 1
  // Isso resolve problema do cliente não encontrar templates quando
  // os IDs são enviados como strings mas definidos como números (ou vice-versa)
  return allTemplates.find(t => t.tpl == tpl);
}

export { templates };