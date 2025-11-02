/**
 * Map Loader - Carregamento de Mapas com Hot-Reload
 * 
 * Este módulo carrega mapas em formato JSON e monitora mudanças
 * para recarregar automaticamente (hot-reload).
 * 
 * Formato do mapa:
 * {
 *   "id": "caverealm",
 *   "version": 14,
 *   "title": "Custom Map",
 *   "width": 15,
 *   "height": 15,
 *   "tiles": [...],
 *   "objects": [
 *     { "x": 10, "y": 5, "d": "torch|chest" }
 *   ]
 * }
 */

import fs from 'fs/promises';
import chokidar from 'chokidar';

/**
 * Classe que gerencia o carregamento de mapas
 */
export class MapLoader {
  constructor(mapFile, logger) {
    this.mapFile = mapFile;
    this.logger = logger;
    this.mapData = null;
    this.watcher = null;
    this.onChangeCallbacks = [];
  }

  /**
   * Inicializa o loader: carrega mapa e configura watcher
   */
  async init() {
    // Carrega mapa inicial
    await this.loadMap();

    // Configura watcher para hot-reload
    this.watcher = chokidar.watch(this.mapFile, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50
      }
    });

    this.watcher.on('change', () => this.handleMapChange());
    this.watcher.on('error', (err) => this.logger.error({ err }, 'Watcher error'));
    this.watcher.on('ready', () => this.logger.debug('Map watcher ready'));

    this.logger.info({ file: this.mapFile }, 'Map loader initialized with hot-reload');
  }

  /**
   * Carrega o mapa do arquivo JSON
   */
  async loadMap() {
    try {
      const content = await fs.readFile(this.mapFile, 'utf-8');
      this.mapData = JSON.parse(content);
      
      // Valida estrutura básica
      if (!this.mapData.id || !this.mapData.width || !this.mapData.height) {
        throw new Error('Invalid map format: missing id, width or height');
      }

      // Garante que objects existe
      if (!this.mapData.objects) {
        this.mapData.objects = [];
      }

      this.logger.info({ 
        id: this.mapData.id, 
        width: this.mapData.width, 
        height: this.mapData.height,
        objects: this.mapData.objects.length
      }, 'Map loaded');
    } catch (err) {
      this.logger.error({ err, file: this.mapFile }, 'Failed to load map');
      throw err;
    }
  }

  /**
   * Handler para mudanças no arquivo de mapa
   */
  async handleMapChange() {
    this.logger.info({ file: this.mapFile }, 'Map file changed, reloading');
    
    const oldObjects = this.mapData ? [...this.mapData.objects] : [];
    await this.loadMap();
    
    // Notifica callbacks sobre a mudança
    this.notifyChange(oldObjects, this.mapData.objects);
  }

  /**
   * Notifica callbacks sobre mudanças no mapa
   */
  notifyChange(oldObjects, newObjects) {
    for (const callback of this.onChangeCallbacks) {
      try {
        callback(oldObjects, newObjects, this.mapData);
      } catch (err) {
        this.logger.error({ err }, 'Error in map change callback');
      }
    }
  }

  /**
   * Registra callback para ser notificado de mudanças
   */
  onChange(callback) {
    this.onChangeCallbacks.push(callback);
  }

  /**
   * Retorna os dados do mapa
   */
  getMapData() {
    return this.mapData;
  }

  /**
   * Para o watcher (cleanup)
   */
  async shutdown() {
    if (this.watcher) {
      await this.watcher.close();
      this.logger.info('Map loader watcher closed');
    }
  }
}
