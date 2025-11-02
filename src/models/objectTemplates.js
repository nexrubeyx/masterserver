// Registro de templates que o client entende via 'obj_tpl'.
// Campos: tpl, name, desc, stack, pickup, block, spr (ícone item16), build (opcional).
// No 'build': negativos usam atlas de tiles (tile16), positivos usam atlas de itens (item16).
// Flags: f=foreground, a=anim, b=bloqueia, o|N|=offset vertical, t|RRGGBB|=tint, q|alpha|=opacity, n/s/e/w=offset por tile.
// ATENÇÃO: ajuste IDs de sprite conforme seus atlases. Abaixo são exemplos.

export default [
  {
    tpl: "tree_oak",
    name: "Árvore de Carvalho",
    desc: "Uma árvore grande.",
    stack: 0,
    pickup: 0,
    block: 1,     // bloqueia passagem
    spr: 720,     // ícone (item16) — ajuste conforme seu atlas
    // Exemplo: tronco (tile) + copa (tile) acima do player, leve offset para cima.
    // Substitua -305 e -289 pelos seus IDs corretos de tile16.
    build: "-305, o|-20| -289f"
  },
  {
    tpl: "barrel_small",
    name: "Barril Pequeno",
    desc: "Um pequeno barril.",
    stack: 0,
    pickup: 0,
    block: 0,
    spr: 812,     // ícone (item16)
    build: "812"  // único sprite (item16)
  }
];