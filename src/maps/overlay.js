/**
 * Object Overlay - Gerenciamento de Objetos por Tile
 * 
 * Este módulo mantém um índice de objetos por coordenada (tile)
 * e permite consultas rápidas e atualizações.
 * 
 * Formato de objeto no mapa:
 * { "x": 10, "y": 5, "d": "torch|chest" }
 * 
 * O campo "d" pode conter um ou mais templates separados por "|"
 */

/**
 * Classe que gerencia o overlay de objetos no mapa
 */
export class ObjectOverlay {
  constructor(logger) {
    this.logger = logger;
    this.objectsByTile = new Map(); // Map<"x,y", string[]>
    this.mapWidth = 0;
    this.mapHeight = 0;
  }

  /**
   * Inicializa o overlay com dados do mapa
   */
  init(mapData) {
    this.mapWidth = mapData.width;
    this.mapHeight = mapData.height;
    this.rebuildIndex(mapData.objects || []);
  }

  /**
   * Reconstrói o índice de objetos a partir da lista de objetos
   */
  rebuildIndex(objects) {
    this.objectsByTile.clear();

    for (const obj of objects) {
      const key = `${obj.x},${obj.y}`;
      const templates = obj.d.split('|').map(t => t.trim()).filter(t => t);
      
      if (templates.length > 0) {
        this.objectsByTile.set(key, templates);
      }
    }

    this.logger.debug({ tiles: this.objectsByTile.size }, 'Object index rebuilt');
  }

  /**
   * Retorna templates de objetos em uma coordenada específica
   */
  getObjectsAt(x, y) {
    const key = `${x},${y}`;
    return this.objectsByTile.get(key) || [];
  }

  /**
   * Define objetos em uma coordenada específica
   */
  setObjectsAt(x, y, templates) {
    const key = `${x},${y}`;
    
    if (!templates || templates.length === 0) {
      this.objectsByTile.delete(key);
    } else {
      this.objectsByTile.set(key, templates);
    }
  }

  /**
   * Adiciona um objeto em uma coordenada (usado para client build)
   */
  addObjectAt(x, y, tpl) {
    const current = this.getObjectsAt(x, y);
    if (!current.includes(tpl)) {
      current.push(tpl);
      this.setObjectsAt(x, y, current);
    }
  }

  /**
   * Retorna objetos em uma região retangular
   */
  getObjectsInRect(x, y, width, height) {
    const result = [];

    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const tx = x + dx;
        const ty = y + dy;
        
        const objects = this.getObjectsAt(tx, ty);
        if (objects.length > 0) {
          result.push({
            x: tx,
            y: ty,
            d: objects.join('|')
          });
        }
      }
    }

    return result;
  }

  /**
   * Retorna todos os tiles que foram modificados comparando duas listas de objetos
   */
  getChangedTiles(oldObjects, newObjects) {
    const changedTiles = new Set();

    // Tiles dos objetos antigos
    for (const obj of oldObjects) {
      changedTiles.add(`${obj.x},${obj.y}`);
    }

    // Tiles dos objetos novos
    for (const obj of newObjects) {
      changedTiles.add(`${obj.x},${obj.y}`);
    }

    return Array.from(changedTiles).map(key => {
      const [x, y] = key.split(',').map(Number);
      return { x, y };
    });
  }
}
