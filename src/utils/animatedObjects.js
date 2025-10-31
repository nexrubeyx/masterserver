export function buildAnimatedObjTplPacket(tpl, frameA, frameB, options = {}) {
  const {
    name = "Animated Object",
    desc = "2-frame animation",
    stack = 0,
    pickup = 0,
    block = 1,
    tint,
    alpha,
    offsetY,
  } = options;

  const partA = [
    frameA,
    tint ? `t|${tint}|` : null,
    typeof alpha === "number" ? `q|${alpha}|` : null,
    typeof offsetY === "number" ? `o|${offsetY}|` : null,
  ].filter(Boolean).join(",");

  const partB = [
    `${frameB}a`,
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
    spr: frameA,
    build: `${partA},${partB}`,
  };
}

export function buildPlaceObjectPacket(x, y, tpl) {
  return { type: "o", x, y, d: tpl };
}