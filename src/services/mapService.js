/**
 * Serviço de Mapas - Carregamento e Gerenciamento de Mapas
 * 
 * Este serviço gerencia todos os mapas do jogo:
 * - Carrega mapas do MongoDB na inicialização
 * - Verifica e atualiza mapas quando a versão muda no JSON
 * - Valida e normaliza dados dos mapas
 * - Fornece acesso aos mapas por ID
 * - Gera payloads de viewport (tiles visíveis)
 * - Gerencia transições entre mapas (vizinhos)
 * 
 * Formato do JSON do mapa:
 * {
 *   "id": "overworld",
 *   "version": 1,  // Versão do mapa (incrementar quando alterar)
 *   "title": "Mundo Principal",
 *   "width": 100,
 *   "height": 100,
 *   "tiles": [[tile1, tile2, ...], [row2...], ...],  // Array 2D
 *   // OU
 *   "tiles": "0:0:0:0:209:209:209:...",  // String separada por ':'
 *   "fill": 0,  // Alternativa a tiles: preenche tudo com tile 0
 *   "templates": [  // Templates de objetos específicos deste mapa
 *     {
 *       "tpl": "tree_oak",
 *       "name": "Árvore",
 *       "desc": "Uma árvore",
 *       "stack": 0,
 *       "pickup": 0,
 *       "block": 1,
 *       "spr": 720,
 *       "build": "-305, o|-20| -289f"
 *     }
 *   ],
 *   "neighbors": {
 *     "north": "forest",
 *     "south": "cave",
 *     "east": "town",
 *     "west": "beach"
 *   },
 *   "objectSpawns": [...]  // Objetos animados
 * }
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { findAllMaps, upsertMap } from '../models/Map.js';
import { registerTemplates } from './templateService.js';

/**
 * Obtém diretório raiz do projeto (src/)
 * 
 * Necessário porque ES6 modules não têm __dirname global.
 * 
 * @returns {string} Caminho absoluto para src/
 */
function rootDir() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.join(__dirname, '..');
}

/**
 * Remove comentários de JSON
 * 
 * Permite usar comentários em arquivos JSON de mapas para documentação.
 * Remove tanto comentários de linha (//) quanto de bloco (/* *\/).
 * 
 * @param {string} str - Conteúdo do arquivo JSON
 * @returns {string} JSON sem comentários
 */
function stripJsonComments(str) {
  // Remove comentários de bloco /* ... *\/
  let s = str.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Remove comentários de linha // ...
  // Regex: (^|[^:]) garante que não remove // em URLs (http://)
  s = s.replace(/(^|[^:])\/\/.*$/gm, '$1');
  
  return s;
}

export class MapService {
  /**
   * Construtor - Inicializa o serviço de mapas
   * 
   * @param {Object} env - Configurações do ambiente
   * @param {Object} logger - Logger
   */
  constructor(env, logger) {
    this.env = env;
    this.logger = logger;
    
    // Mapa de mapas: mapId -> { width, height, title, id, tiles:number[][], neighbors }
    this.maps = new Map();
  }

  /**
   * Carrega todos os mapas do MongoDB ou JSON
   * 
   * Chamado durante a inicialização do servidor.
   * 
   * Fluxo:
   * 1. Carrega mapas do MongoDB
   * 2. Lê arquivos JSON da pasta maps/worlds/
   * 3. Compara versões entre JSON e MongoDB
   * 4. Atualiza MongoDB se versão do JSON for mais recente
   * 5. Carrega mapas na memória
   * 
   * @returns {Promise<void>}
   * @throws {Error} Se algum mapa for inválido
   */
  async loadAll() {
    // Caminho para pasta de mapas: src/maps/worlds/
    const mapsDir = path.join(rootDir(), 'maps', 'worlds');
    
    // Cria pasta se não existir
    if (!fs.existsSync(mapsDir)) fs.mkdirSync(mapsDir, { recursive: true });

    // === PASSO 1: Carrega mapas do MongoDB ===
    let dbMaps = [];
    let dbMapsByID = new Map();
    
    try {
      dbMaps = await findAllMaps();
      dbMapsByID = new Map(dbMaps.map(m => [m.id, m]));
      this.logger.info({ count: dbMaps.length }, 'Mapas carregados do MongoDB');
    } catch (err) {
      this.logger.error({ err: String(err) }, 'Erro ao carregar mapas do MongoDB, continuando sem cache');
      // Continua a execução - mapas serão carregados dos JSONs
    }

    // === PASSO 2: Lê arquivos JSON ===
    const files = fs.readdirSync(mapsDir).filter(f => f.endsWith('.json'));
    
    if (!files.length) {
      this.logger.warn({ mapsDir }, 'Nenhum arquivo de mapa encontrado. Crie mapas em src/maps/worlds/*.json');
    }

    // === PASSO 3: Processa cada arquivo JSON ===
    for (const f of files) {
      const full = path.join(mapsDir, f);
      
      // Lê arquivo e remove comentários
      const raw = fs.readFileSync(full, 'utf8');
      const cleaned = stripJsonComments(raw);

      // Parseia JSON
      let json;
      try {
        json = JSON.parse(cleaned);
      } catch (err) {
        throw new Error(`Falha ao parsear ${f}: ${err.message}`);
      }

      // === VALIDAÇÃO BÁSICA ===
      
      // Usa nome do arquivo como ID se não especificado
      if (!json.id) json.id = path.basename(f, '.json');
      
      // version é obrigatório agora
      if (typeof json.version !== 'number') {
        this.logger.warn({ id: json.id, file: f }, 'Mapa sem versão definida, usando versão 1');
        json.version = 1;
      }
      
      // width e height são obrigatórios
      if (typeof json.width !== 'number' || typeof json.height !== 'number') {
        throw new Error(`Mapa ${json.id} sem width/height válidos`);
      }

      // === VERIFICA SE PRECISA ATUALIZAR NO MONGODB ===
      const dbMap = dbMapsByID.get(json.id);
      let shouldUpdate = false;
      // finalMapData will point to either normalized JSON or MongoDB version
      // NOTA: json object may be modified during normalization - this is intentional
      let finalMapData = json; 
      
      if (!dbMap) {
        // Mapa não existe no MongoDB - precisa inserir
        this.logger.info({ id: json.id, version: json.version }, 'Novo mapa detectado, inserindo no MongoDB');
        shouldUpdate = true;
      } else if (dbMap.version !== json.version) {
        // Versão diferente - precisa atualizar
        this.logger.info(
          { id: json.id, oldVersion: dbMap.version, newVersion: json.version },
          'Versão do mapa alterada, atualizando MongoDB'
        );
        shouldUpdate = true;
      }

      // Se precisa atualizar, normaliza e salva
      if (shouldUpdate) {
        this.normalizeMapData(finalMapData);
        
        // Tenta salvar no MongoDB com tratamento de erros
        try {
          await upsertMap(finalMapData);
          this.logger.debug({ id: finalMapData.id, version: finalMapData.version }, 'Mapa salvo no MongoDB');
        } catch (err) {
          this.logger.error(
            { id: finalMapData.id, err: String(err) },
            'Erro ao salvar mapa no MongoDB, usando versão local'
          );
          // Continua com a versão normalizada do JSON
        }
      } else {
        // Usa a versão do MongoDB (não precisa normalizar de novo)
        finalMapData = dbMap;
        this.logger.debug({ id: finalMapData.id, version: finalMapData.version }, 'Mapa carregado do MongoDB (versão atual)');
      }

      // Armazena mapa no Map interno
      this.maps.set(finalMapData.id, finalMapData);
      
      // Registra templates do mapa se existirem
      if (Array.isArray(finalMapData.templates) && finalMapData.templates.length > 0) {
        registerTemplates(finalMapData.templates);
        this.logger.debug(
          { id: finalMapData.id, templateCount: finalMapData.templates.length }, 
          'Templates do mapa registrados'
        );
      }
      
      // Loga sucesso do carregamento individual
      this.logger.debug({ id: finalMapData.id, w: finalMapData.width, h: finalMapData.height }, 'Mapa carregado');
    }

    // === PASSO 4: Carrega mapas do MongoDB que não estão nos JSONs ===
    // Isso permite ter mapas criados apenas no MongoDB
    for (const dbMap of dbMaps) {
      if (!this.maps.has(dbMap.id)) {
        this.maps.set(dbMap.id, dbMap);
        
        // Registra templates do mapa se existirem
        if (Array.isArray(dbMap.templates) && dbMap.templates.length > 0) {
          registerTemplates(dbMap.templates);
          this.logger.debug(
            { id: dbMap.id, templateCount: dbMap.templates.length }, 
            'Templates do mapa registrados (MongoDB)'
          );
        }
        
        this.logger.debug({ id: dbMap.id }, 'Mapa carregado do MongoDB (sem JSON correspondente)');
      }
    }

    // Loga total de mapas carregados
    this.logger.info({ count: this.maps.size }, 'Mapas carregados na memória');
  }

  /**
   * Normaliza dados do mapa
   * 
   * Chamado antes de salvar um mapa no MongoDB para garantir que os dados
   * estão em formato consistente e válido.
   * 
   * NOTA: Esta função modifica o objeto json in-place. Isso é intencional
   * para evitar cópias profundas de arrays grandes de tiles.
   * 
   * @param {Object} json - Dados do mapa a normalizar (modificado in-place!)
   */
  normalizeMapData(json) {
    // === GERAÇÃO/NORMALIZAÇÃO DE TILES ===
    
    // Se tiles é uma string (formato "0:0:0:209:209:..."), converte para array 2D
    if (typeof json.tiles === 'string') {
      // Separa string por ':' e converte cada valor para número
      const tileValues = json.tiles.split(':').map(v => {
        const num = Number(v);
        return Number.isFinite(num) ? num : 0;
      });
      
      // Converte array linear em array 2D (height x width)
      json.tiles = [];
      for (let y = 0; y < json.height; y++) {
        const row = [];
        for (let x = 0; x < json.width; x++) {
          const index = y * json.width + x;
          row.push(index < tileValues.length ? tileValues[index] : 0);
        }
        json.tiles.push(row);
      }
    }
    // Se não tem array de tiles mas tem "fill", gera tiles preenchidos
    else if (!Array.isArray(json.tiles) && typeof json.fill === 'number') {
      // Cria array 2D: height linhas x width colunas, todas com valor fill
      json.tiles = Array.from({ length: json.height }, () =>
        Array.from({ length: json.width }, () => json.fill)
      );
    }

    // Se ainda não tem tiles, cria array vazio
    if (!Array.isArray(json.tiles)) json.tiles = [];
    
    // === NORMALIZAÇÃO DE LINHAS ===
    // Garante que tem exatamente 'height' linhas
    if (json.tiles.length < json.height) {
      // Faltam linhas - adiciona linhas vazias (preenchidas com 0)
      const missing = json.height - json.tiles.length;
      for (let i = 0; i < missing; i++) {
        json.tiles.push(Array.from({ length: json.width }, () => 0));
      }
    } else if (json.tiles.length > json.height) {
      // Sobram linhas - trunca
      json.tiles.length = json.height;
    }
    
    // === NORMALIZAÇÃO DE COLUNAS ===
    // Para cada linha, garante que tem exatamente 'width' colunas
    for (let y = 0; y < json.height; y++) {
      // Se linha não é array, cria array vazio
      if (!Array.isArray(json.tiles[y])) json.tiles[y] = [];
      
      // Se faltam colunas, adiciona zeros
      if (json.tiles[y].length < json.width) {
        const miss = json.width - json.tiles[y].length;
        for (let k = 0; k < miss; k++) json.tiles[y].push(0);
      } 
      // Se sobram colunas, trunca
      else if (json.tiles[y].length > json.width) {
        json.tiles[y].length = json.width;
      }
      
      // === NORMALIZAÇÃO DE VALORES ===
      // Garante que cada tile é um número válido
      for (let x = 0; x < json.width; x++) {
        const v = json.tiles[y][x];
        // Se não é número finito, usa 0
        json.tiles[y][x] = Number.isFinite(v) ? v : 0;
      }
    }
  }

  /**
   * Obtém um mapa por ID
   * 
   * @param {string} id - ID do mapa
   * @returns {Object|undefined} Objeto do mapa ou undefined se não existe
   */
  getMap(id) {
    return this.maps.get(id);
  }

  /**
   * Obtém mapa vizinho em uma direção
   * 
   * @param {string} mapId - ID do mapa atual
   * @param {string} dir - Direção ('north', 'south', 'east', 'west')
   * @returns {Object|null} Objeto do mapa vizinho ou null se não há
   * 
   * Usado para transições entre mapas (quando implementado).
   * Lê propriedade neighbors do JSON do mapa.
   */
  getNeighbor(mapId, dir) {
    const m = this.getMap(mapId);
    if (!m) return null;
    
    // Obtém ID do vizinho naquela direção
    const nId = m.neighbors?.[dir] || null;
    if (!nId) return null;
    
    // Retorna objeto do mapa vizinho
    return this.getMap(nId);
  }

  /**
   * Constrói payload de viewport com tiles visíveis
   * 
   * Gera string de tiles no formato "t1:t2:t3:..." para enviar ao cliente.
   * 
   * @param {Object} map - Objeto do mapa
   * @param {number} x - Posição X do jogador
   * @param {number} y - Posição Y do jogador
   * @param {number} rx - Raio horizontal (18 = 36 tiles de largura)
   * @param {number} ry - Raio vertical (13 = 26 tiles de altura)
   * @returns {string} String "tile:tile:tile:..." com todos os tiles
   * 
   * O viewport é uma grade retangular ao redor do jogador:
   * - Vai de (x-rx) até (x+rx) horizontalmente
   * - Vai de (y-ry) até (y+ry) verticalmente
   * 
   * Tiles fora do mapa são substituídos por DEFAULT_CAVE_WALL
   * para evitar "preto" nas bordas.
   */
    /**
   * Constrói payload de viewport com tiles visíveis
   * 
   * Gera string de tiles no formato "t1:t2:t3:..." para enviar ao cliente.
   */
  buildViewportPayload(map, x, y, rx, ry) {
    const out = [];

    // Tile de fallback quando fora do mapa
    const oobTile = Number.isFinite(this.env.DEFAULT_CAVE_WALL)
      ? String(this.env.DEFAULT_CAVE_WALL)
      : '0';

    // IMPORTANTE: usar limites EXCLUSIVOS para casar com o cliente (2*rx x 2*ry)
    // Ordem coluna→linha (cx externo, cy interno), igual ao cliente.
    for (let cx = -rx; cx < rx; cx++) {
      for (let cy = -ry; cy < ry; cy++) {
        const tx = x + cx;
        const ty = y + cy;

        if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) {
          out.push(oobTile);
          continue;
        }

        const row = Array.isArray(map.tiles[ty]) ? map.tiles[ty] : null;
        if (!row) {
          out.push(oobTile);
          continue;
        }

        const cell = Number.isFinite(row[tx]) ? row[tx] : 0;
        out.push(String(cell));
      }
    }

    // (Opcional) Sanidade: garantir tamanho esperado
    // esperado = (2*rx) * (2*ry)
    const expected = (rx << 1) * (ry << 1);
    if (out.length !== expected) {
      this.logger?.warn({ have: out.length, expected, rx, ry }, 'Viewport size mismatch (server)');
    }

    return out.join(':');
  }
  
  

  /**
   * Limita coordenadas aos limites do mapa
   * 
   * @param {Object} map - Objeto do mapa
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   * @returns {Object} { x, y } dentro dos limites
   * 
   * Útil para garantir que posição está válida.
   * Clamp significa "aperta" valores para dentro do intervalo válido.
   */
  clampToBounds(map, x, y) {
    const nx = Math.max(0, Math.min(map.width - 1, x));
    const ny = Math.max(0, Math.min(map.height - 1, y));
    return { x: nx, y: ny };
  }

/**
 * Verifica se jogador saiu do mapa e calcula transição
 * 
 * NOTA: Esta função existe mas NÃO é usada na implementação atual.
 * O playerService bloqueia movimento nas bordas em vez de fazer transição.
 * 
 * Se fosse usada, permitiria transições automáticas entre mapas vizinhos
 * quando o jogador sai pelas bordas.
 * 
 * @param {Object} player - Jogador
 * @returns {Object|null} { toMap, x, y, edge } se deve transitar, null caso contrário
 * 
 * Lógica:
 * - Se jogador sair pela borda E há mapa vizinho: retorna transição
 * - Se jogador sair pela borda E NÃO há vizinho: clamp posição e bloqueia
 */
checkExitAndTransition(player) {
  const map = this.getMap(player.mapId);
  if (!map) return null;

  // Limpa estado anterior de bloqueio
  player._blockedEdge = null;

  // === VERIFICAÇÃO HORIZONTAL ===
  
  // Saiu pela esquerda (x < 0)
  if (player.x < 0) {
    const west = this.getNeighbor(map.id, 'west');
    // Se há vizinho oeste, retorna dados de transição
    if (west) return { toMap: west.id, x: west.width - 1, y: player.y, edge: 'west' };
    // Se não há vizinho, clamp na borda
    player.x = 0;
    player._blockedEdge = 'west';
  } 
  // Saiu pela direita (x >= width)
  else if (player.x >= map.width) {
    const east = this.getNeighbor(map.id, 'east');
    // Se há vizinho leste, retorna dados de transição
    if (east) return { toMap: east.id, x: 0, y: player.y, edge: 'east' };
    // Se não há vizinho, clamp na borda
    player.x = map.width - 1;
    player._blockedEdge = 'east';
  }

  // === VERIFICAÇÃO VERTICAL ===
  
  // Saiu por cima (y < 0)
  if (player.y < 0) {
    const north = this.getNeighbor(map.id, 'north');
    // Se há vizinho norte, retorna dados de transição
    if (north) return { toMap: north.id, x: player.x, y: north.height - 1, edge: 'north' };
    // Se não há vizinho, clamp na borda
    player.y = 0;
    player._blockedEdge = 'north';
  } 
  // Saiu por baixo (y >= height)
  else if (player.y >= map.height) {
    const south = this.getNeighbor(map.id, 'south');
    // Se há vizinho sul, retorna dados de transição
    if (south) return { toMap: south.id, x: player.x, y: 0, edge: 'south' };
    // Se não há vizinho, clamp na borda
    player.y = map.height - 1;
    player._blockedEdge = 'south';
  }

  // Jogador está dentro dos limites, sem transição
  return null;
}
}

// Nenhuma alteração necessária para chunk aqui.
