// Registro de templates que o client entende via 'obj_tpl'.
// Campos: tpl, name, desc, stack, pickup, block, spr (ícone item16), build (opcional).
// No 'build': negativos usam atlas de tiles (tile16), positivos usam atlas de itens (item16).
// Flags: f=foreground, a=anim, b=bloqueia, o|N|=offset vertical, t|RRGGBB|=tint, q|alpha|=opacity, n/s/e/w=offset por tile.
// ATENÇÃO: ajuste IDs de sprite conforme seus atlases. Abaixo são exemplos.

export default [
  {
    tpl: 1,
    name: "Dirt",
    spr: 698,
    stack: 1,
    pickup: 0,
    block: 1,
    build: "-577b"
  },


  {
    tpl: 2,
    name: "Dirt",
    spr: 698,
    stack: 1,
    pickup: 0,
    block: 1,
    build: "-576b"
  },


  {
    tpl: 3,
    name: "Dirt",
    spr: 698,
    stack: 1,
    pickup: 0,
    block: 0,
    build: "-966"
  },
  {
    tpl: 4,
    name: "Dirt",
    spr: 698,
    stack: 1,
    pickup: 0,
    block: 0,
    build: "-965"
  },
  {
    tpl: 5,
    name: "Dirt",
    spr: 698,
    stack: 1,
    pickup: 0,
    block: 0,
    build: "-994"
  },

  {
    tpl: 6,
    name: "Dirt",
    spr: 698,
    stack: 1,
    pickup: 0,
    block: 1,
    build: "937b"
  },

  {
    tpl: 7,
    name: "Sign",
    spr: 0,
    stack: 0,
    pickup: 0,
    block: 1,
  },

  {
    tpl: 8,
    name: "Dirt",
    spr: 698,
    stack: 1,
    pickup: 0,
    block: 0,
    build: "-995"
  },

  {
    tpl: 9,
    name: "Dirt",
    spr: 698,
    stack: 1,
    pickup: 0,
    block: 1,
    build: "-497b,-499ba"
  },

  {
    tpl: 10,
    name: "Spawn",
    spr: 0,
    stack: 0,
    pickup: 0,
    block: 0,
  },

  {
    tpl: 11,
    name: "Dirt",
    spr: 698,
    stack: 1,
    pickup: 0,
    block: 0,
    build: "-979"
  },

  {
    tpl: 12,
    name: "Dirt",
    spr: 698,
    stack: 1,
    pickup: 0,
    block: 0,
    build: "-961"
  },


  {
    tpl: 13,
    name: "Dirt",
    spr: 698,
    stack: 1,
    pickup: 0,
    block: 0,
    build: "-979"
  },


  {
    tpl: 14,
    name: "Dirt",
    spr: 698,
    stack: 1,
    pickup: 0,
    block: 1,
    build: "-340b"
  }
];