// Camada de objetos por tile: (x,y) -> [tpl,...]
// Helpers: add/remove/set/clear e serialização para 'd' (pipe-join).

export class ObjectLayer {
  constructor() {
    this.tiles = new Map(); // key: `${x},${y}` -> string[]
  }

  key(x, y) { return `${x},${y}`; }

  get(x, y) {
    const k = this.key(x, y);
    return this.tiles.get(k) || [];
  }

  set(x, y, list) {
    const k = this.key(x, y);
    if (!list || list.length === 0) this.tiles.delete(k);
    else this.tiles.set(k, list);
  }

  add(x, y, tpl) {
    const list = this.get(x, y).slice();
    if (!list.includes(tpl)) {
      list.push(tpl);
      this.set(x, y, list);
    }
    return list;
  }

  remove(x, y, tpl) {
    const list = this.get(x, y).filter(t => t !== tpl);
    this.set(x, y, list);
    return list;
  }

  clear(x, y) {
    this.set(x, y, []);
  }

  toDString(x, y) {
    return this.get(x, y).join("|");
  }
}