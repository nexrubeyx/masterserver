import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function rootDir() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.join(__dirname, '..');
}

// Remove comentários de JSON: //... e /* ... */
function stripJsonComments(str) {
  let s = str.replace(/\/\*[\s\S]*?\*\//g, '');
  s = s.replace(/(^|[^:])\/\/.*$/gm, '$1');
  return s;
}

export class MapService {
  constructor(env, logger) {
    this.env = env;
    this.logger = logger;
    this.maps = new Map(); // mapId -> { width, height, title, id, tiles:number[][], neighbors }
  }

  async loadAll() {
    const mapsDir = path.join(rootDir(), 'maps', 'worlds');
    if (!fs.existsSync(mapsDir)) fs.mkdirSync(mapsDir, { recursive: true });

    const files = fs.readdirSync(mapsDir).filter(f => f.endsWith('.json'));
    if (!files.length) {
      this.logger.warn({ mapsDir }, 'Nenhum arquivo de mapa encontrado. Crie mapas em src/maps/worlds/*.json');
    }

    for (const f of files) {
      const full = path.join(mapsDir, f);
      const raw = fs.readFileSync(full, 'utf8');
      const cleaned = stripJsonComments(raw);

      let json;
      try {
        json = JSON.parse(cleaned);
      } catch (err) {
        throw new Error(`Falha ao parsear ${f}: ${err.message}`);
      }

      if (!json.id) json.id = path.basename(f, '.json');
      if (typeof json.width !== 'number' || typeof json.height !== 'number') {
        throw new Error(`Mapa ${json.id} sem width/height válidos`);
      }

      // Se vier "fill", generate malha completa
      if (!Array.isArray(json.tiles) && typeof json.fill === 'number') {
        json.tiles = Array.from({ length: json.height }, () =>
          Array.from({ length: json.width }, () => json.fill)
        );
      }

      // Normaliza tiles
      if (!Array.isArray(json.tiles)) json.tiles = [];
      // Garante total de linhas
      if (json.tiles.length < json.height) {
        const missing = json.height - json.tiles.length;
        for (let i = 0; i < missing; i++) {
          json.tiles.push(Array.from({ length: json.width }, () => 0));
        }
      } else if (json.tiles.length > json.height) {
        json.tiles.length = json.height;
      }
      // Garante colunas por linha
      for (let y = 0; y < json.height; y++) {
        if (!Array.isArray(json.tiles[y])) json.tiles[y] = [];
        if (json.tiles[y].length < json.width) {
          const miss = json.width - json.tiles[y].length;
          for (let k = 0; k < miss; k++) json.tiles[y].push(0);
        } else if (json.tiles[y].length > json.width) {
          json.tiles[y].length = json.width;
        }
        // Cast para número seguro
        for (let x = 0; x < json.width; x++) {
          const v = json.tiles[y][x];
          json.tiles[y][x] = Number.isFinite(v) ? v : 0;
        }
      }

      this.maps.set(json.id, json);
      this.logger.debug({ id: json.id, w: json.width, h: json.height }, 'Mapa carregado');
    }

    this.logger.info({ count: this.maps.size }, 'Mapas carregados');
  }

  getMap(id) {
    return this.maps.get(id);
  }

  getNeighbor(mapId, dir) {
    const m = this.getMap(mapId);
    if (!m) return null;
    const nId = m.neighbors?.[dir] || null;
    if (!nId) return null;
    return this.getMap(nId);
  }

  // Retorna string "t:t:t:..." para janela 2*rx por 2*ry
  buildViewportPayload(map, x, y, rx, ry) {
    const out = [];
    for (let cx = -rx; cx < rx; cx++) {
      for (let cy = -ry; cy < ry; cy++) {
        const tx = x + cx;
        const ty = y + cy;

        // fora dos limites -> 0
        if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) {
          out.push('0');
          continue;
        }

        const row = Array.isArray(map.tiles[ty]) ? map.tiles[ty] : null;
        if (!row) {
          out.push('0');
          continue;
        }

        const cell = Number.isFinite(row[tx]) ? row[tx] : 0;
        out.push(String(cell));
      }
    }
    return out.join(':');
  }

  clampToBounds(map, x, y) {
    const nx = Math.max(0, Math.min(map.width - 1, x));
    const ny = Math.max(0, Math.min(map.height - 1, y));
    return { x: nx, y: ny };
  }

  checkExitAndTransition(player) {
    const map = this.getMap(player.mapId);
    if (!map) return null;

    if (player.x < 0) {
      const west = this.getNeighbor(map.id, 'west');
      if (west) return { toMap: west.id, x: west.width - 1, y: player.y, edge: 'west' };
      player.x = 0;
    } else if (player.x >= map.width) {
      const east = this.getNeighbor(map.id, 'east');
      if (east) return { toMap: east.id, x: 0, y: player.y, edge: 'east' };
      player.x = map.width - 1;
    }

    if (player.y < 0) {
      const north = this.getNeighbor(map.id, 'north');
      if (north) return { toMap: north.id, x: player.x, y: north.height - 1, edge: 'north' };
      player.y = 0;
    } else if (player.y >= map.height) {
      const south = this.getNeighbor(map.id, 'south');
      if (south) return { toMap: south.id, x: player.x, y: 0, edge: 'south' };
      player.y = map.height - 1;
    }

    return null;
  }
}