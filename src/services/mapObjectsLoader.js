const {
  buildAnimatedObjTplPacket,
  buildPlaceObjectPacket,
} = require("../utils/animatedObjects");

// Envie os spawns de objetos animados definidos no JSON do mapa para UM player
function sendMapObjectSpawnsToPlayer(player, map) {
  const spawns = Array.isArray(map.objectSpawns) ? map.objectSpawns : [];
  if (!spawns.length) return;

  for (const s of spawns) {
    const tpl = s.tpl || `anim_${s.x}_${s.y}`;
    const frames = Array.isArray(s.frames) ? s.frames : [];
    if (frames.length < 2) continue;

    const frameA = Number(frames[0]);
    const frameB = Number(frames[1]);

    // 1) Envie o template animado (2 frames)
    player.send(
      buildAnimatedObjTplPacket(tpl, frameA, frameB, {
        // você pode customizar name/desc/tint/alpha/offsetY por spawn se quiser
        name: s.name || tpl,
        desc: s.desc || "Animated spawn",
        tint: s.tint,       // "RRGGBB" opcional
        alpha: s.alpha,     // 0..1 opcional
        offsetY: s.offsetY, // int opcional
      })
    );

    // 2) Coloque o objeto na posição
    player.send(buildPlaceObjectPacket(s.x | 0, s.y | 0, tpl));
  }
}

module.exports = { sendMapObjectSpawnsToPlayer };