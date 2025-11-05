/**
 * Serviço de Items - Gerenciamento de Inventário e Items
 * 
 * Este serviço gerencia o inventário dos jogadores, incluindo:
 * - Adicionar/remover items
 * - Equipar/desequipar items
 * - Usar items consumíveis
 * - Enviar updates de inventário para o cliente
 */

import { 
  getItemTemplate, 
  createItem, 
  itemToProtocol,
  addItemToInventory,
  removeItemFromInventory 
} from '../models/Item.js';
import { savePlayerInventory } from '../models/Player.js';

export class ItemService {
  constructor(env, logger, world) {
    this.env = env;
    this.logger = logger;
    this.world = world;
  }

  /**
   * Inicializa inventário de um jogador (carrega do banco ou cria vazio)
   * 
   * @param {Object} player - Jogador
   */
  initializeInventory(player) {
    if (!player.inventory) {
      player.inventory = [];
    }
    
    // Garante que o inventário é um array
    if (!Array.isArray(player.inventory)) {
      player.inventory = [];
    }
  }

  /**
   * Envia inventário completo para o cliente
   * 
   * @param {Object} player - Jogador
   */
  sendInventoryToClient(player) {
    this.initializeInventory(player);
    
    // Converte items do inventário para formato do protocolo
    const items = [];
    for (let i = 0; i < player.inventory.length; i++) {
      const item = player.inventory[i];
      if (item) {
        items.push(itemToProtocol({ ...item, slot: i }));
      }
    }
    
    // Envia pacote 'inv' para o cliente
    const invPacket = {
      type: 'inv',
      data: items
    };
    
    this.world.sendTo(player, invPacket);
  }

  /**
   * Adiciona item ao inventário do jogador
   * 
   * @param {Object} player - Jogador
   * @param {string} templateId - ID do template do item
   * @param {number} quantity - Quantidade (padrão: 1)
   * @returns {Object} { success: boolean, message: string }
   */
  addItem(player, templateId, quantity = 1) {
    this.initializeInventory(player);
    
    const result = addItemToInventory(player.inventory, templateId, quantity);
    
    if (result.success) {
      // Envia inventário atualizado para o cliente
      this.sendInventoryToClient(player);
      
      // Persiste no banco de dados (async, não espera)
      savePlayerInventory(player._id, player.inventory).catch(err => {
        this.logger.error({ err: err.message }, 'Failed to save inventory');
      });
    }
    
    return result;
  }

  /**
   * Remove item do inventário do jogador
   * 
   * @param {Object} player - Jogador
   * @param {number} slot - Slot do item
   * @param {number} quantity - Quantidade (padrão: 1)
   * @returns {Object} { success: boolean, message: string }
   */
  removeItem(player, slot, quantity = 1) {
    this.initializeInventory(player);
    
    const result = removeItemFromInventory(player.inventory, slot, quantity);
    
    if (result.success) {
      // Envia inventário atualizado para o cliente
      this.sendInventoryToClient(player);
      
      // Persiste no banco de dados (async, não espera)
      savePlayerInventory(player._id, player.inventory).catch(err => {
        this.logger.error({ err: err.message }, 'Failed to save inventory');
      });
    }
    
    return result;
  }

  /**
   * Equipa item do inventário
   * 
   * @param {Object} player - Jogador
   * @param {number} slot - Slot do item a equipar
   * @returns {Object} { success: boolean, message: string }
   */
  equipItem(player, slot) {
    this.initializeInventory(player);
    
    const item = player.inventory[slot];
    
    if (!item) {
      return { success: false, message: 'Item not found' };
    }
    
    const template = getItemTemplate(item.template);
    if (!template || !template.equippable) {
      return { success: false, message: 'Item cannot be equipped' };
    }
    
    // Se o item já está equipado, desequipa
    if (item.equipped === 1) {
      item.equipped = 0;
      this.sendInventoryToClient(player);
      
      // Persiste no banco de dados
      savePlayerInventory(player._id, player.inventory).catch(err => {
        this.logger.error({ err: err.message }, 'Failed to save inventory');
      });
      
      return { success: true, message: 'Item unequipped' };
    }
    
    // Desequipa outros items do mesmo tipo (ex: só pode ter 1 arma equipada)
    if (template.equipSlot) {
      for (let i = 0; i < player.inventory.length; i++) {
        const otherItem = player.inventory[i];
        if (otherItem && otherItem.equipped > 0) {
          const otherTemplate = getItemTemplate(otherItem.template);
          if (otherTemplate && otherTemplate.equipSlot === template.equipSlot) {
            otherItem.equipped = 0;
          }
        }
      }
    }
    
    // Equipa o item
    item.equipped = 1;
    
    // Envia inventário atualizado
    this.sendInventoryToClient(player);
    
    // Persiste no banco de dados
    savePlayerInventory(player._id, player.inventory).catch(err => {
      this.logger.error({ err: err.message }, 'Failed to save inventory');
    });
    
    return { success: true, message: 'Item equipped' };
  }

  /**
   * Usa item consumível
   * 
   * @param {Object} player - Jogador
   * @param {number} slot - Slot do item
   * @returns {Object} { success: boolean, message: string, effect?: Object }
   */
  useItem(player, slot) {
    this.initializeInventory(player);
    
    const item = player.inventory[slot];
    
    if (!item) {
      return { success: false, message: 'Item not found' };
    }
    
    const template = getItemTemplate(item.template);
    if (!template || !template.consumable) {
      return { success: false, message: 'Item cannot be used' };
    }
    
    // Remove 1 unidade do item
    const removeResult = this.removeItem(player, slot, 1);
    if (!removeResult.success) {
      return removeResult;
    }
    
    // Aplica efeito do item
    const effect = this.applyItemEffect(player, template);
    
    return { success: true, message: 'Item used', effect };
  }

  /**
   * Aplica efeito de um item consumível
   * 
   * @param {Object} player - Jogador
   * @param {Object} template - Template do item
   * @returns {Object} Efeito aplicado
   * @private
   */
  applyItemEffect(player, template) {
    const effect = {};
    
    // Health potion
    if (template.attributes.healAmount) {
      // TODO: Implementar sistema de HP quando existir
      effect.heal = template.attributes.healAmount;
      this.logger.info(
        { player: player.name, heal: effect.heal },
        'Player used health potion'
      );
    }
    
    // Mana potion
    if (template.attributes.manaAmount) {
      // TODO: Implementar sistema de mana quando existir
      effect.mana = template.attributes.manaAmount;
      this.logger.info(
        { player: player.name, mana: effect.mana },
        'Player used mana potion'
      );
    }
    
    return effect;
  }

  /**
   * Dá item inicial para um jogador novo
   * 
   * @param {Object} player - Jogador
   */
  giveStarterItems(player) {
    this.initializeInventory(player);
    
    // Dá items iniciais
    this.addItem(player, 'wooden_pickaxe', 1);
    this.addItem(player, 'wooden_sword', 1);
    this.addItem(player, 'stone', 10);
    this.addItem(player, 'wood', 10);
    
    this.logger.info(
      { player: player.name },
      'Gave starter items to player'
    );
  }

  /**
   * Troca dois items de slot no inventário
   * 
   * @param {Object} player - Jogador
   * @param {number} slotA - Primeiro slot
   * @param {number} slotB - Segundo slot
   * @returns {Object} { success: boolean, message: string }
   */
  swapInventorySlots(player, slotA, slotB) {
    this.initializeInventory(player);
    
    // Valida slots
    if (slotA < 0 || slotA >= 100 || slotB < 0 || slotB >= 100) {
      return { success: false, message: 'Invalid slot' };
    }
    
    // Se os slots são iguais, não faz nada
    if (slotA === slotB) {
      return { success: true, message: 'Same slot' };
    }
    
    // Troca os items de slot
    const temp = player.inventory[slotA];
    player.inventory[slotA] = player.inventory[slotB];
    player.inventory[slotB] = temp;
    
    // Atualiza o campo slot nos items (se existirem)
    if (player.inventory[slotA]) {
      player.inventory[slotA].slot = slotA;
    }
    if (player.inventory[slotB]) {
      player.inventory[slotB].slot = slotB;
    }
    
    // Envia inventário atualizado para o cliente
    this.sendInventoryToClient(player);
    
    // Persiste no banco de dados (async, não espera)
    savePlayerInventory(player._id, player.inventory).catch(err => {
      this.logger.error({ err: err.message }, 'Failed to save inventory after swap');
    });
    
    return { success: true, message: 'Slots swapped' };
  }
}
