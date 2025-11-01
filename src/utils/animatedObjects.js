/**
 * Utilitários para Objetos Animados no Mapa
 * 
 * Este módulo fornece funções para criar objetos animados de 2 frames no mapa.
 * Objetos animados podem ser água, fogo, portais, etc - qualquer coisa que
 * alterna entre dois sprites para criar animação.
 * 
 * Sistema de animação:
 * - Frame A: sprite base (ex: água calma)
 * - Frame B: sprite alternativo com sufixo 'a' (ex: água ondulante)
 * - Cliente alterna entre frames automaticamente
 * 
 * Customizações disponíveis:
 * - tint: cor de tintura (hex)
 * - alpha: transparência (0.0 a 1.0)
 * - offsetY: deslocamento vertical em pixels
 * - block: se bloqueia movimento (1 = sim, 0 = não)
 * - pickup: se pode ser coletado (1 = sim, 0 = não)
 */

/**
 * Cria um pacote de template de objeto animado
 * 
 * @param {string} tpl - ID único do template (ex: 'anim_water', 'anim_fire')
 * @param {number} frameA - Número do sprite do primeiro frame
 * @param {number} frameB - Número do sprite do segundo frame
 * @param {Object} options - Opções de customização
 * @param {string} [options.name] - Nome do objeto
 * @param {string} [options.desc] - Descrição do objeto
 * @param {number} [options.stack] - Se empilhável (0 = não)
 * @param {number} [options.pickup] - Se pode ser coletado (0 = não)
 * @param {number} [options.block] - Se bloqueia movimento (1 = sim)
 * @param {string} [options.tint] - Cor de tintura em hex (ex: '00AAFF')
 * @param {number} [options.alpha] - Transparência (0.0 a 1.0)
 * @param {number} [options.offsetY] - Deslocamento vertical em pixels
 * @returns {Object} Pacote obj_tpl para enviar ao cliente
 * 
 * O pacote retornado deve ser enviado ao cliente antes de colocar
 * o objeto no mapa (usando buildPlaceObjectPacket).
 * 
 * Exemplo:
 * const tpl = buildAnimatedObjTplPacket('water', 21, 22, {
 *   name: 'Água',
 *   tint: '0088FF',
 *   alpha: 0.8
 * });
 * world.sendTo(player, tpl);
 */
export function buildAnimatedObjTplPacket(tpl, frameA, frameB, options = {}) {
  // Extrai opções com valores padrão
  const {
    name = "Animated Object",      // Nome do objeto
    desc = "2-frame animation",     // Descrição
    stack = 0,                      // Não empilhável
    pickup = 0,                     // Não pode ser coletado
    block = 1,                      // Bloqueia movimento
    tint,                           // Cor de tintura (opcional)
    alpha,                          // Transparência (opcional)
    offsetY,                        // Offset vertical (opcional)
  } = options;

  // Constrói string de sprites para o frame A
  // Formato: "sprite[,modificador|valor|]*"
  const partA = [
    frameA,                                                    // Sprite base
    tint ? `t|${tint}|` : null,                               // Tintura se especificada
    typeof alpha === "number" ? `q|${alpha}|` : null,          // Alpha se especificado
    typeof offsetY === "number" ? `o|${offsetY}|` : null,      // Offset Y se especificado
  ].filter(Boolean).join(",");  // Remove nulls e junta com vírgulas

  // Constrói string de sprites para o frame B
  // Igual ao frame A mas sprite termina com 'a' (convenção do cliente)
  const partB = [
    `${frameB}a`,                                              // Sprite alternativo (sufixo 'a')
    tint ? `t|${tint}|` : null,                               // Tintura se especificada
    typeof alpha === "number" ? `q|${alpha}|` : null,          // Alpha se especificado
    typeof offsetY === "number" ? `o|${offsetY}|` : null,      // Offset Y se especificado
  ].filter(Boolean).join(",");

  // Retorna pacote obj_tpl completo
  return {
    type: "obj_tpl",      // Tipo de pacote
    tpl,                  // ID do template
    name,                 // Nome do objeto
    desc,                 // Descrição
    stack,                // Se empilhável
    pickup,               // Se pode ser coletado
    block,                // Se bloqueia movimento
    spr: frameA,          // Sprite padrão (frame A)
    build: `${partA},${partB}`,  // String de construção da animação
  };
}

/**
 * Cria um pacote para colocar um objeto no mapa
 * 
 * @param {number} x - Coordenada X no mapa
 * @param {number} y - Coordenada Y no mapa
 * @param {string} tpl - ID do template do objeto (deve existir no cliente)
 * @returns {Object} Pacote 'o' para enviar ao cliente
 * 
 * Este pacote instancia um objeto no tile especificado usando um
 * template previamente enviado com buildAnimatedObjTplPacket.
 * 
 * Exemplo:
 * // Primeiro envia o template
 * world.sendTo(player, buildAnimatedObjTplPacket('water', 21, 22));
 * 
 * // Depois coloca o objeto no mapa
 * world.sendTo(player, buildPlaceObjectPacket(10, 15, 'water'));
 */
export function buildPlaceObjectPacket(x, y, tpl) {
  return { 
    type: "o",    // Tipo de pacote: object placement
    x,            // Posição X
    y,            // Posição Y
    d: tpl        // ID do template (data)
  };
}