// Helpers para construir pacotes de objeto animado (2 frames) e colocar no mapa

function buildAnimatedObjTplPacket(tpl, frameA, frameB, options = {}) {
  const {
    name = "Animated Object",
    desc = "2-frame animation",
    stack = 0,
    pickup = 0,
    block = 0,
    tint,     // "RRGGBB" ex.: "00AAFF"
    alpha,    // ex.: 0.9
    offsetY,  // ex.: 6
  } = options;

  const partA = [
    frameA,
    tint ? `t|${tint}|` : null,
    typeof alpha === "number" ? `q|${alpha}|` : null,
    typeof offsetY === "number" ? `o|${offsetY}|` : null,
  ].filter(Boolean).join(",");

  const partB = [
    `${frameB}a`, // sufixo 'a' envia para anim2_container (frame B)
    tint ? `t|${tint}|` : null,
    typeof alpha === "number" ? `q|${alpha}|` : null,
    typeof offsetY === "number" ? `o|${offsetY}|` : null,
  ].filter(Boolean).join(",");

  return {
    type: "obj_tpl",
    tpl,
    name,
    desc,
    stack,
    pickup,
    block,
    spr: frameA,                // base; negativo = tileset, positivo = itemset
    build: `${partA},${partB}`, // dois frames; o segundo tem 'a'
  };
}

function buildPlaceObjectPacket(x, y, tpl) {
  return { type: "o", x, y, d: tpl };
}

function buildRemoveObjectPacket(x, y) {
  return { type: "o", x, y, d: "" };
}

module.exports = {
  buildAnimatedObjTplPacket,
  buildPlaceObjectPacket,
  buildRemoveObjectPacket,
};