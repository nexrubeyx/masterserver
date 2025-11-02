/**
 * Template Registry - Gerenciamento de Templates de Objetos com Hot-Reload
 * 
 * Este módulo gerencia o carregamento e atualização automática de templates
 * de objetos a partir de arquivos JSON em um diretório.
 * 
 * Funcionalidades:
 * - Carrega templates de arquivos .json no diretório especificado
 * - Suporta múltiplos formatos: objeto único, array, ou objeto chaveado
 * - Hot-reload automático quando arquivos são modificados
 * - Notifica callbacks quando templates são atualizados
 */

import fs from 'fs/promises';
import path from 'path';
import chokidar from 'chokidar';

/**
 * Classe que gerencia o registro de templates
 */
export class TemplateRegistry {
  constructor(templatesDir, logger) {
    this.templatesDir = templatesDir;
    this.logger = logger;
    this.templates = new Map(); // Map<tpl: string, template: object>
    this.watcher = null;
    this.onChangeCallbacks = [];
  }

  /**
   * Inicializa o registry: carrega templates e configura watcher
   */
  async init() {
    // Garante que o diretório existe
    try {
      await fs.mkdir(this.templatesDir, { recursive: true });
    } catch (err) {
      // Ignora se já existe
    }

    // Carrega templates iniciais
    await this.loadAll();

    // Configura watcher para hot-reload
    this.watcher = chokidar.watch(`${this.templatesDir}/*.json`, {
      persistent: true,
      ignoreInitial: true
    });

    this.watcher.on('add', (filePath) => this.handleFileChange(filePath));
    this.watcher.on('change', (filePath) => this.handleFileChange(filePath));
    this.watcher.on('unlink', (filePath) => this.handleFileDelete(filePath));

    this.logger.info({ dir: this.templatesDir }, 'Template registry initialized with hot-reload');
  }

  /**
   * Carrega todos os templates do diretório
   */
  async loadAll() {
    try {
      const files = await fs.readdir(this.templatesDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      for (const file of jsonFiles) {
        const filePath = path.join(this.templatesDir, file);
        await this.loadFile(filePath);
      }

      this.logger.info({ count: this.templates.size }, 'Templates loaded');
    } catch (err) {
      this.logger.error({ err, dir: this.templatesDir }, 'Failed to load templates');
    }
  }

  /**
   * Carrega templates de um arquivo JSON
   * Suporta: objeto único, array, ou objeto chaveado
   */
  async loadFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);

      // Determina o formato e extrai templates
      let templates = [];
      
      if (Array.isArray(data)) {
        // Formato: array de templates
        templates = data;
      } else if (data.tpl) {
        // Formato: objeto único com campo 'tpl'
        templates = [data];
      } else {
        // Formato: objeto chaveado { "torch": {...}, "chest": {...} }
        templates = Object.values(data);
      }

      // Registra cada template
      for (const tpl of templates) {
        if (tpl.tpl) {
          this.templates.set(tpl.tpl, tpl);
        }
      }

      this.logger.debug({ file: path.basename(filePath), count: templates.length }, 'Template file loaded');
    } catch (err) {
      this.logger.error({ err, file: filePath }, 'Failed to load template file');
    }
  }

  /**
   * Handler para mudanças em arquivos
   */
  async handleFileChange(filePath) {
    this.logger.info({ file: path.basename(filePath) }, 'Template file changed, reloading');
    await this.loadFile(filePath);
    this.notifyChange();
  }

  /**
   * Handler para exclusão de arquivos
   */
  async handleFileDelete(filePath) {
    this.logger.info({ file: path.basename(filePath) }, 'Template file deleted');
    // Remove templates deste arquivo (não temos um mapeamento perfeito, então recarregamos tudo)
    this.templates.clear();
    await this.loadAll();
    this.notifyChange();
  }

  /**
   * Notifica todos os callbacks registrados sobre mudanças
   */
  notifyChange() {
    for (const callback of this.onChangeCallbacks) {
      try {
        callback(this.getAllTemplates());
      } catch (err) {
        this.logger.error({ err }, 'Error in template change callback');
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
   * Retorna todos os templates como array
   */
  getAllTemplates() {
    return Array.from(this.templates.values());
  }

  /**
   * Retorna template específico por nome
   */
  getTemplate(tpl) {
    return this.templates.get(tpl);
  }

  /**
   * Para o watcher (cleanup)
   */
  async shutdown() {
    if (this.watcher) {
      await this.watcher.close();
      this.logger.info('Template registry watcher closed');
    }
  }
}
