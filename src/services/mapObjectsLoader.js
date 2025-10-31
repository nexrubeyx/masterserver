import {
  buildAnimatedObjTplPacket,
  buildPlaceObjectPacket,
} from "../utils/animatedObjects.js";

export function sendMapObjectSpawnsToPlayer(player, map, world) {
  const spawns = Array.isArray(map.objectSpawns) ? map.objectSpawns : [];
  for (const s of spawns) {
    const tpl = s.tpl || `anim_${s.x}_${s.y}`;
    const frames = Array.isArray(s.frames) ? s.frames : [];
    if (frames.length < 2) continue;

    const frameA = Number(frames[0]);
    const frameB = Number(frames[1]);

    world.sendTo(
      player,
      buildAnimatedObjTplPacket(tpl, frameA, frameB, {
        name: s.name || tpl,
        desc: s.desc || "Animated spawn",
        tint: s.tint,
        alpha: s.alpha,
        offsetY: s.offsetY,
      })
    );
    world.sendTo(player, buildPlaceObjectPacket(s.x | 0, s.y | 0, tpl));
  }
}