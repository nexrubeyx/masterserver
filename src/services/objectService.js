/**
 * Object Service - World Object Management
 * 
 * This service manages world objects on the map:
 * - Maintains per-tile object stacks
 * - Handles object placement and removal
 * - Processes pickup interactions
 * - Broadcasts object state to clients
 * 
 * Object state structure per map:
 * Map {
 *   "x,y" -> [{ tpl: "stone", count: 3 }, { tpl: "wood", count: 1 }]
 * }
 * 
 * Protocol messages:
 * - obj_tpl: sends object template definition to client
 * - o: places object at position (initial state)
 * - obj: updates object state (add/remove)
 */

import { OBJECT_TEMPLATES, getAllTemplateKeys } from '../constants/objectTemplates.js';

export class ObjectService {
  /**
   * Constructor - Initialize object service
   * 
   * @param {Object} env - Environment configuration
   * @param {Object} logger - Logger instance
   * @param {Object} world - World instance
   */
  constructor(env, logger, world) {
    this.env = env;
    this.logger = logger;
    this.world = world;
    
    // Object state per map: Map<mapId, Map<"x,y", Array<{tpl, count}>>>
    this.objectsByMap = new Map();
  }

  /**
   * Initialize object service
   * Called during world initialization
   */
  async init() {
    // Initialize object state for each map
    for (const mapId of this.world.mapService.maps.keys()) {
      this.objectsByMap.set(mapId, new Map());
      
      // TODO: Load saved object state from database
      // For now, spawn initial objects based on map configuration
      this.spawnInitialObjects(mapId);
    }
    
    this.logger.info({ maps: this.objectsByMap.size }, 'ObjectService initialized');
  }

  /**
   * Spawn initial objects on a map
   * 
   * @param {string} mapId - Map ID
   */
  spawnInitialObjects(mapId) {
    const map = this.world.mapService.getMap(mapId);
    if (!map) return;
    
    // Check if map has objectPlacements defined
    if (!Array.isArray(map.objectPlacements)) return;
    
    const objects = this.objectsByMap.get(mapId);
    if (!objects) return;
    
    // Place each configured object
    for (const placement of map.objectPlacements) {
      const { x, y, tpl, count = 1 } = placement;
      
      // Validate template exists
      if (!OBJECT_TEMPLATES[tpl]) {
        this.logger.warn({ mapId, x, y, tpl }, 'Unknown object template in map config');
        continue;
      }
      
      // Place the object
      this.placeObject(mapId, x, y, tpl, count);
    }
    
    this.logger.debug({ mapId, count: map.objectPlacements.length }, 'Initial objects spawned');
  }

  /**
   * Place an object at a position
   * 
   * @param {string} mapId - Map ID
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} tpl - Object template key
   * @param {number} count - Number of objects to place
   */
  placeObject(mapId, x, y, tpl, count = 1) {
    const objects = this.objectsByMap.get(mapId);
    if (!objects) return;
    
    const key = `${x},${y}`;
    let stack = objects.get(key);
    
    if (!stack) {
      stack = [];
      objects.set(key, stack);
    }
    
    // Find existing object of this type in stack
    let existing = stack.find(obj => obj.tpl === tpl);
    
    if (existing) {
      existing.count += count;
    } else {
      stack.push({ tpl, count });
    }
  }

  /**
   * Remove objects from a position
   * 
   * @param {string} mapId - Map ID
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} tpl - Object template key
   * @param {number} count - Number of objects to remove
   * @returns {number} Number of objects actually removed
   */
  removeObject(mapId, x, y, tpl, count = 1) {
    const objects = this.objectsByMap.get(mapId);
    if (!objects) return 0;
    
    const key = `${x},${y}`;
    const stack = objects.get(key);
    if (!stack) return 0;
    
    // Find object in stack
    const existing = stack.find(obj => obj.tpl === tpl);
    if (!existing) return 0;
    
    // Calculate how many to actually remove
    const removed = Math.min(count, existing.count);
    existing.count -= removed;
    
    // Remove from stack if count reaches 0
    if (existing.count <= 0) {
      const index = stack.indexOf(existing);
      stack.splice(index, 1);
      
      // Remove key if stack is empty
      if (stack.length === 0) {
        objects.delete(key);
      }
    }
    
    return removed;
  }

  /**
   * Get objects at a position
   * 
   * @param {string} mapId - Map ID
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Array<{tpl, count}>} Array of objects at position
   */
  getObjectsAt(mapId, x, y) {
    const objects = this.objectsByMap.get(mapId);
    if (!objects) return [];
    
    const key = `${x},${y}`;
    return objects.get(key) || [];
  }

  /**
   * Check if position has blocking objects
   * 
   * @param {string} mapId - Map ID
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if any object blocks movement
   */
  hasBlockingObject(mapId, x, y) {
    const objs = this.getObjectsAt(mapId, x, y);
    
    for (const obj of objs) {
      const template = OBJECT_TEMPLATES[obj.tpl];
      if (template && template.block) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Send object templates to a player
   * Called when player connects
   * 
   * @param {Object} player - Player object
   */
  sendTemplates(player) {
  const templates = getAllTemplateKeys();
  for (const key of templates) {
    const tpl = OBJECT_TEMPLATES[key];
    this.world.sendTo(player, {
      type: 'obj_tpl',
      tpl: tpl.tpl,
      name: tpl.name,
      desc: tpl.desc,
      stack: tpl.stack,
      pickup: tpl.pickup,
      block: tpl.block,
      spr: tpl.spr,
      build: tpl.build
    });
  }
}

  /**
   * Send objects in player's viewport
   * Called when player logs in or viewport changes
   * 
   * @param {Object} player - Player object
   */
  sendVisibleObjects(player) {
    // Determine visible area (viewport)
    const viewOX = player.ox ?? player.x;
    const viewOY = player.oy ?? player.y;
    const viewW = player.viewW ?? 15; // Default viewport width
    const viewH = player.viewH ?? 11; // Default viewport height

    // Loop through each tile in the viewport
    for (let dx = 0; dx < viewW; dx++) {
      for (let dy = 0; dy < viewH; dy++) {
        const x = viewOX + dx;
        const y = viewOY + dy;
        const stack = this.getObjectsAt(player.mapId, x, y);
        for (const obj of stack) {
          this.world.sendTo(player, {
            type: 'o',
            x,
            y,
            d: obj.tpl,
            c: obj.count
          });
        }
      }
    }
}

  /**
   * Handle pickup interaction
   * 
   * @param {Object} player - Player attempting pickup
   * @param {number} x - X coordinate of object
   * @param {number} y - Y coordinate of object
   * @param {string} tpl - Object template key
   * @returns {boolean} True if pickup succeeded
   */
  handlePickup(player, x, y, tpl) {
    // Validate template exists
    const template = OBJECT_TEMPLATES[tpl];
    if (!template) {
      this.logger.warn({ player: player.name, tpl }, 'Unknown template in pickup');
      return false;
    }
    
    // Validate template is pickupable
    if (!template.pickup) {
      this.logger.debug({ player: player.name, tpl }, 'Template not pickupable');
      return false;
    }
    
    // Validate player is adjacent or on the tile
    const dx = Math.abs(player.x - x);
    const dy = Math.abs(player.y - y);
    if (dx > 1 || dy > 1) {
      this.logger.debug({ player: player.name, x, y }, 'Pickup too far');
      return false;
    }
    
    // Remove one object from the world
    const removed = this.removeObject(player.mapId, x, y, tpl, 1);
    if (removed === 0) {
      this.logger.debug({ player: player.name, x, y, tpl }, 'No object to pickup');
      return false;
    }
    
    // Add to player's inventory
    // TODO: Implement proper inventory management
    // For now, just broadcast the removal
    
    // Broadcast object removal to all players in map
    const remainingObjs = this.getObjectsAt(player.mapId, x, y);
    const remaining = remainingObjs.find(o => o.tpl === tpl);
    
    this.world.broadcastInMap(player.mapId, {
      type: 'obj',
      x,
      y,
      d: tpl,
      c: remaining ? remaining.count : 0
    });
    
    this.logger.debug({ player: player.name, x, y, tpl }, 'Object picked up');
    return true;
  }
}
