/**
 * Exemplo de Registro de Água Animada
 * 
 * Este arquivo demonstra como criar e colocar objetos animados no mapa.
 * Neste exemplo específico, mostra como criar água animada com 2 frames.
 * 
 * NOTA: Este arquivo usa CommonJS (require/module.exports) em vez de ES6 modules.
 * É apenas um exemplo de referência e não é usado pelo servidor principal.
 * 
 * Para usar no servidor principal (ES6), converta para:
 * import { buildAnimatedObjTplPacket, buildPlaceObjectPacket } from "../utils/animatedObjects.js";
 * export { sendAnimatedWaterForPlayer };
 */

const {
  buildAnimatedObjTplPacket,
  buildPlaceObjectPacket,
} = require("../utils/animatedObjects");

/**
 * Envia objeto de água animada para um jogador
 * 
 * @param {Object} player - Objeto do jogador com método send()
 * @param {number} x - Coordenada X onde colocar a água (padrão: 10)
 * @param {number} y - Coordenada Y onde colocar a água (padrão: 10)
 * 
 * Processo:
 * 1. Envia template 'anim_water' definindo os 2 frames da animação
 * 2. Coloca o objeto na posição especificada do mapa
 * 
 * Parâmetros visuais usados:
 * - Frames: -21 (água calma) e -22 (água ondulante)
 * - Tint: azul claro (00AAFF)
 * - Alpha: 90% opaco (0.9)
 * - OffsetY: 6 pixels acima do tile
 * 
 * IMPORTANTE: O template deve ser enviado apenas uma vez por sessão/cliente,
 * mas pode ser reutilizado para múltiplos objetos do mesmo tipo.
 */
function sendAnimatedWaterForPlayer(player, x = 10, y = 10) {
  // 1) Envia o template (faça isso uma vez por sessão/cliente ou garanta idempotência)
  // Define como o objeto "anim_water" deve ser renderizado
  player.send(buildAnimatedObjTplPacket("anim_water", -21, -22, {
    name: "Água Animada",       // Nome do objeto
    desc: "Teste 2 frames",     // Descrição
    tint: "00AAFF",             // Cor azul claro
    alpha: 0.9,                 // 90% opaco
    offsetY: 6,                 // 6 pixels acima do tile
  }));

  // 2) Coloca o objeto no tile desejado usando o template
  // Pode colocar múltiplas águas reutilizando o mesmo template
  player.send(buildPlaceObjectPacket(x, y, "anim_water"));
}

// Exporta a função para uso em CommonJS
module.exports = { sendAnimatedWaterForPlayer };