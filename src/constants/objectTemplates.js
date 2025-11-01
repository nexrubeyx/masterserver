/**
 * Object Templates - World Object Definitions
 * 
 * This module defines templates for world objects that can be placed on tiles
 * and interacted with by players (pickup, use, etc).
 * 
 * Compatible with the client protocol (ml.min.js) which expects obj_tpl messages with:
 * - tpl: unique template key (string)
 * - name: display name (string)
 * - desc: description (string)
 * - stack: can_stack (boolean or 0/1)
 * - pickup: can_pickup (boolean or 0/1)
 * - block: can_block (boolean or 0/1)
 * - spr: sprite index (number; positive = items sprite sheet index, negative = tile index)
 * - build: optional build string for composed sprites
 * 
 * Initial templates: stone, wood, bush
 */

/**
 * Object template definitions
 * Each template defines how an object looks and behaves
 */
export const OBJECT_TEMPLATES = {
  stone: {
    tpl: 'stone',
    name: 'Stone',
    desc: 'A solid piece of stone, useful for building.',
    stack: 1,        // Can be stacked in inventory
    pickup: 1,       // Can be picked up
    block: 1,        // Blocks movement
    spr: 10,         // Sprite index from items sheet (positive number)
    build: ''        // No composed sprite needed
  },
  
  wood: {
    tpl: 'wood',
    name: 'Wood',
    desc: 'A piece of wood, good for crafting.',
    stack: 1,        // Can be stacked in inventory
    pickup: 1,       // Can be picked up
    block: 0,        // Does not block movement
    spr: 15,         // Sprite index from items sheet
    build: ''        // No composed sprite needed
  },
  
  bush: {
    tpl: 'bush',
    name: 'Bush',
    desc: 'A leafy bush. Might have berries.',
    stack: 1,        // Can be stacked in inventory
    pickup: 1,       // Can be picked up
    block: 1,        // Blocks movement
    spr: -74,        // Negative = tile index (tile 74 = bush sprite)
    build: ''        // No composed sprite needed
  }
};

/**
 * Get all object template keys
 * @returns {Array<string>} Array of template keys
 */
export function getAllTemplateKeys() {
  return Object.keys(OBJECT_TEMPLATES);
}

/**
 * Get a specific object template
 * @param {string} tpl - Template key
 * @returns {Object|undefined} Template object or undefined
 */
export function getTemplate(tpl) {
  return OBJECT_TEMPLATES[tpl];
}

/**
 * Check if a template exists
 * @param {string} tpl - Template key
 * @returns {boolean} True if template exists
 */
export function hasTemplate(tpl) {
  return tpl in OBJECT_TEMPLATES;
}
