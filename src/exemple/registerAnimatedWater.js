const {
  buildAnimatedObjTplPacket,
  buildPlaceObjectPacket,
} = require("../utils/animatedObjects");

// Chame esta função quando quiser disponibilizar e mostrar o objeto animado
function sendAnimatedWaterForPlayer(player, x = 10, y = 10) {
  // 1) Envia o template (faça isso uma vez por sessão/cliente ou garanta idempotência)
  player.send(buildAnimatedObjTplPacket("anim_water", -21, -22, {
    name: "Água Animada",
    desc: "Teste 2 frames",
    tint: "00AAFF",
    alpha: 0.9,
    offsetY: 6,
  }));

  // 2) Coloca o objeto no tile desejado
  player.send(buildPlaceObjectPacket(x, y, "anim_water"));
}

module.exports = { sendAnimatedWaterForPlayer };