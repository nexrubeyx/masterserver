/**
 * Model de Item - Gerenciamento de Items do Inventário
 * 
 * Este módulo define a estrutura de items no jogo e funções para manipulá-los.
 * Items podem ser coletados, equipados, usados e trocados entre jogadores.
 * 
 * Estrutura de um item no inventário:
 * {
 *   slot: number,           // Posição no inventário (0-N)
 *   template: string,       // ID do template do item (ex: "stone", "wood", "sword")
 *   name: string,           // Nome exibido do item
 *   sprite: number,         // ID do sprite do item (índice na spritesheet)
 *   quantity: number,       // Quantidade (stackable items)
 *   equipped: number,       // 0=não equipado, 1=equipado, 2=equipado com estado especial
 *   color: string,          // Cor do item em hexadecimal (sem #)
 *   durability: number,     // Durabilidade atual (para items que quebram)
 *   maxDurability: number,  // Durabilidade máxima
 *   attributes: Object      // Atributos customizados (damage, defense, speed, etc)
 * }
 */

/**
 * Template de Item - Define propriedades base de um tipo de item
 * 
 * Templates são configurações globais que definem o comportamento
 * de cada tipo de item no jogo.
 */
export const itemTemplates = {
  // === RECURSOS BÁSICOS ===
  stone: {
    name: 'Stone',
    sprite: 0,
    stackable: true,
    maxStack: 999,
    color: 'AAAAAA',
    description: 'A piece of stone',
    category: 'resource',
    attributes: {}
  },
  
  wood: {
    name: 'Wood',
    sprite: 1,
    stackable: true,
    maxStack: 999,
    color: '8B4513',
    description: 'A piece of wood',
    category: 'resource',
    attributes: {}
  },
  
  iron_ore: {
    name: 'Iron Ore',
    sprite: 2,
    stackable: true,
    maxStack: 999,
    color: 'C0C0C0',
    description: 'Raw iron ore',
    category: 'resource',
    attributes: {}
  },
  
  // === FERRAMENTAS ===
  wooden_pickaxe: {
    name: 'Wooden Pickaxe',
    sprite: 10,
    stackable: false,
    maxStack: 1,
    color: '8B4513',
    description: 'A basic wooden pickaxe',
    category: 'tool',
    equippable: true,
    durability: 50,
    attributes: {
      miningPower: 1,
      miningSpeed: 1.0
    }
  },
  
  stone_pickaxe: {
    name: 'Stone Pickaxe',
    sprite: 11,
    stackable: false,
    maxStack: 1,
    color: 'AAAAAA',
    description: 'A stone pickaxe',
    category: 'tool',
    equippable: true,
    durability: 100,
    attributes: {
      miningPower: 2,
      miningSpeed: 1.2
    }
  },
  
  // === ARMAS ===
  wooden_sword: {
    name: 'Wooden Sword',
    sprite: 20,
    stackable: false,
    maxStack: 1,
    color: '8B4513',
    description: 'A basic wooden sword',
    category: 'weapon',
    equippable: true,
    durability: 50,
    attributes: {
      damage: 5,
      attackSpeed: 1.0
    }
  },
  
  iron_sword: {
    name: 'Iron Sword',
    sprite: 21,
    stackable: false,
    maxStack: 1,
    color: 'C0C0C0',
    description: 'A sturdy iron sword',
    category: 'weapon',
    equippable: true,
    durability: 200,
    attributes: {
      damage: 15,
      attackSpeed: 1.1
    }
  },
  
  // === ARMADURAS ===
  leather_helmet: {
    name: 'Leather Helmet',
    sprite: 30,
    stackable: false,
    maxStack: 1,
    color: '8B4513',
    description: 'A leather helmet',
    category: 'armor',
    equippable: true,
    equipSlot: 'head',
    durability: 100,
    attributes: {
      defense: 2
    }
  },
  
  iron_helmet: {
    name: 'Iron Helmet',
    sprite: 31,
    stackable: false,
    maxStack: 1,
    color: 'C0C0C0',
    description: 'An iron helmet',
    category: 'armor',
    equippable: true,
    equipSlot: 'head',
    durability: 300,
    attributes: {
      defense: 5
    }
  },
  
  // === CONSUMÍVEIS ===
  health_potion: {
    name: 'Health Potion',
    sprite: 40,
    stackable: true,
    maxStack: 10,
    color: 'FF0000',
    description: 'Restores 50 health',
    category: 'consumable',
    consumable: true,
    attributes: {
      healAmount: 50
    }
  },
  
  mana_potion: {
    name: 'Mana Potion',
    sprite: 41,
    stackable: true,
    maxStack: 10,
    color: '0000FF',
    description: 'Restores 50 mana',
    category: 'consumable',
    consumable: true,
    attributes: {
      manaAmount: 50
    }
  }
};

/**
 * Obtém template de um item pelo ID
 * 
 * @param {string} templateId - ID do template (ex: "stone", "wooden_sword")
 * @returns {Object|null} Template do item ou null se não existir
 */
export function getItemTemplate(templateId) {
  return itemTemplates[templateId] || null;
}

/**
 * Cria um novo item baseado em um template
 * 
 * @param {string} templateId - ID do template
 * @param {number} quantity - Quantidade inicial (padrão: 1)
 * @param {number} slot - Slot no inventário (opcional)
 * @returns {Object|null} Item criado ou null se template não existir
 */
export function createItem(templateId, quantity = 1, slot = null) {
  const template = getItemTemplate(templateId);
  if (!template) return null;
  
  const item = {
    slot: slot,
    template: templateId,
    name: template.name,
    sprite: template.sprite,
    quantity: Math.min(quantity, template.maxStack || 1),
    equipped: 0,
    color: template.color,
    attributes: { ...template.attributes }
  };
  
  // Adiciona durabilidade se o item tiver
  if (template.durability) {
    item.durability = template.durability;
    item.maxDurability = template.durability;
  }
  
  return item;
}

/**
 * Converte item para formato do protocolo do cliente
 * 
 * O cliente espera o formato:
 * { slot, n, t, spr, qty, eqp, col }
 * 
 * @param {Object} item - Item do inventário
 * @returns {Object} Item no formato do protocolo
 */
export function itemToProtocol(item) {
  return {
    slot: item.slot,
    n: item.name,
    t: item.template,
    spr: item.sprite,
    qty: item.quantity,
    eqp: item.equipped,
    col: item.color
  };
}

/**
 * Adiciona item ao inventário de um jogador
 * 
 * Tenta empilhar com items existentes do mesmo tipo primeiro.
 * Se não conseguir empilhar, adiciona em um novo slot vazio.
 * 
 * @param {Array} inventory - Inventário do jogador
 * @param {string} templateId - ID do template do item
 * @param {number} quantity - Quantidade a adicionar
 * @returns {Object} { success: boolean, message: string }
 */
export function addItemToInventory(inventory, templateId, quantity = 1) {
  const template = getItemTemplate(templateId);
  if (!template) {
    return { success: false, message: 'Item template not found' };
  }
  
  let remainingQty = quantity;
  
  // Se o item é stackable, tenta empilhar com items existentes
  if (template.stackable) {
    for (let i = 0; i < inventory.length; i++) {
      const item = inventory[i];
      if (item && item.template === templateId) {
        const maxStack = template.maxStack || 1;
        const canAdd = Math.min(maxStack - item.quantity, remainingQty);
        
        if (canAdd > 0) {
          item.quantity += canAdd;
          remainingQty -= canAdd;
        }
        
        if (remainingQty <= 0) {
          return { success: true, message: 'Item added to inventory' };
        }
      }
    }
  }
  
  // Adiciona em slots vazios
  while (remainingQty > 0) {
    // Encontra primeiro slot vazio
    let emptySlot = -1;
    for (let i = 0; i < 100; i++) { // Máximo de 100 slots
      if (!inventory[i]) {
        emptySlot = i;
        break;
      }
    }
    
    if (emptySlot === -1) {
      return { success: false, message: 'Inventory full' };
    }
    
    // Cria novo item no slot vazio
    const qtyToAdd = Math.min(remainingQty, template.maxStack || 1);
    const newItem = createItem(templateId, qtyToAdd, emptySlot);
    inventory[emptySlot] = newItem;
    remainingQty -= qtyToAdd;
  }
  
  return { success: true, message: 'Item added to inventory' };
}

/**
 * Remove item do inventário de um jogador
 * 
 * @param {Array} inventory - Inventário do jogador
 * @param {number} slot - Slot do item
 * @param {number} quantity - Quantidade a remover (padrão: 1)
 * @returns {Object} { success: boolean, message: string }
 */
export function removeItemFromInventory(inventory, slot, quantity = 1) {
  const item = inventory[slot];
  
  if (!item) {
    return { success: false, message: 'Item not found' };
  }
  
  if (item.quantity < quantity) {
    return { success: false, message: 'Not enough items' };
  }
  
  item.quantity -= quantity;
  
  // Remove item se a quantidade for 0
  if (item.quantity <= 0) {
    inventory[slot] = null;
  }
  
  return { success: true, message: 'Item removed from inventory' };
}

/**
 * Lista todos os templates de items disponíveis
 * 
 * @returns {Array} Array com IDs de todos os templates
 */
export function getAllItemTemplates() {
  return Object.keys(itemTemplates);
}
