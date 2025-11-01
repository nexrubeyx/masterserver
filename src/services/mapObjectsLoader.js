/**
 * Carregador de Objetos do Mapa - Spawns de Objetos Animados
 * 
 * Este módulo é responsável por enviar objetos animados do mapa para os jogadores.
 * Quando um jogador entra em um mapa ou muda de viewport, esta função envia
 * todos os objetos animados (água, fogo, portais, etc) que devem aparecer.
 * 
 * Os objetos são definidos no JSON do mapa na propriedade 'objectSpawns':
 * {
 *   "objectSpawns": [
 *     {
 *       "tpl": "water_anim",
 *       "x": 10,
 *       "y": 15,
 *       "frames": [21, 22],
 *       "name": "Água",
 *       "tint": "00AAFF",
 *       "alpha": 0.8
 *     }
 *   ]
 * }
 */

import {
  buildAnimatedObjTplPacket,
  buildPlaceObjectPacket,
} from "../utils/animatedObjects.js";

/**
 * Envia todos os objetos animados do mapa para um jogador
 * 
 * @param {Object} player - Jogador que deve receber os objetos
 * @param {Object} map - Objeto do mapa contendo objectSpawns
 * @param {Object} world - Instância do World para enviar pacotes
 * 
 * Para cada objeto no mapa:
 * 1. Envia template do objeto (obj_tpl) com definição visual
 * 2. Envia colocação do objeto (o) na posição especificada
 * 
 * O template precisa ser enviado antes de colocar o objeto, pois o
 * cliente precisa saber como renderizar aquele tipo de objeto.
 * 
 * Objetos com menos de 2 frames são ignorados (animação requer 2 frames).
 */
export function sendMapObjectSpawnsToPlayer(player, map, world) {
  // Obtém array de spawns do mapa (ou array vazio se não definido)
  const spawns = Array.isArray(map.objectSpawns) ? map.objectSpawns : [];
  
  // Processa cada objeto definido no mapa
  for (const s of spawns) {
    // ID do template - usa o especificado ou gera baseado na posição
    const tpl = s.tpl || `anim_${s.x}_${s.y}`;
    
    // Array de frames da animação (deve ter pelo menos 2)
    const frames = Array.isArray(s.frames) ? s.frames : [];
    
    // Pula objetos sem frames suficientes para animação
    if (frames.length < 2) continue;

    // Converte frames para números
    const frameA = Number(frames[0]);  // Frame base
    const frameB = Number(frames[1]);  // Frame alternativo

    // === PASSO 1: Envia template do objeto ===
    // Define como o objeto deve ser renderizado
    world.sendTo(
      player,
      buildAnimatedObjTplPacket(tpl, frameA, frameB, {
        name: s.name || tpl,           // Nome do objeto
        desc: s.desc || "Animated spawn", // Descrição
        tint: s.tint,                  // Cor de tintura (opcional)
        alpha: s.alpha,                // Transparência (opcional)
        offsetY: s.offsetY,            // Offset vertical (opcional)
      })
    );
    
    // === PASSO 2: Coloca o objeto no mapa ===
    // Instancia o objeto na posição especificada
    world.sendTo(player, buildPlaceObjectPacket(s.x | 0, s.y | 0, tpl));
  }
}