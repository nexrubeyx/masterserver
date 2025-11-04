/**
 * Costume Service - Gerenciamento de Sistema de Fantasias/Costumes
 * 
 * Este módulo gerencia o sistema de costumes (fantasias) do jogo,
 * incluindo a loja de costumes, compra, e tentativa de costumes.
 */

import { addCostumeToUser, getUserCostumeData } from '../models/User.js';

/**
 * Configuração de costumes
 * Define custos em diamantes para cada costume
 */
const COSTUME_COSTS = {
  // Costumes baratos (Halloween event ou baixo custo)
  // IDs 1-10: 2-5 diamantes
  1: 2, 2: 3, 3: 4, 4: 5, 5: 2, 6: 3, 7: 4, 8: 5, 9: 2, 10: 3,
  
  // Costumes médios
  // IDs 11-50: 5-15 diamantes
  11: 5, 12: 6, 13: 7, 14: 8, 15: 10, 16: 12, 17: 15, 18: 10, 19: 12, 20: 15,
  21: 5, 22: 6, 23: 7, 24: 8, 25: 10, 26: 12, 27: 15, 28: 10, 29: 12, 30: 15,
  31: 5, 32: 6, 33: 7, 34: 8, 35: 10, 36: 12, 37: 15, 38: 10, 39: 12, 40: 15,
  41: 5, 42: 6, 43: 7, 44: 8, 45: 10, 46: 12, 47: 15, 48: 10, 49: 12, 50: 15,
  
  // Costumes caros (raros)
  // IDs 51-100: 20-50 diamantes
  51: 20, 52: 25, 53: 30, 54: 35, 55: 40, 56: 45, 57: 50, 58: 40, 59: 45, 60: 50,
  61: 20, 62: 25, 63: 30, 64: 35, 65: 40, 66: 45, 67: 50, 68: 40, 69: 45, 70: 50,
  71: 20, 72: 25, 73: 30, 74: 35, 75: 40, 76: 45, 77: 50, 78: 40, 79: 45, 80: 50,
  81: 20, 82: 25, 83: 30, 84: 35, 85: 40, 86: 45, 87: 50, 88: 40, 89: 45, 90: 50,
  91: 20, 92: 25, 93: 30, 94: 35, 95: 40, 96: 45, 97: 50, 98: 40, 99: 45, 100: 50,
  
  // Costumes muito raros (premium)
  // IDs 101-148: 60-100 diamantes
  101: 60, 102: 70, 103: 80, 104: 90, 105: 100, 106: 80, 107: 90, 108: 100, 109: 80, 110: 90,
  111: 60, 112: 70, 113: 80, 114: 90, 115: 100, 116: 80, 117: 90, 118: 100, 119: 80, 120: 90,
  121: 60, 122: 70, 123: 80, 124: 90, 125: 100, 126: 80, 127: 90, 128: 100, 129: 80, 130: 90,
  131: 60, 132: 70, 133: 80, 134: 90, 135: 100, 136: 80, 137: 90, 138: 100, 139: 80, 140: 90,
  141: 60, 142: 70, 143: 80, 144: 90, 145: 100, 146: 80, 147: 90, 148: 100
};

const MAX_COSTUMES = 148;

/**
 * Obtém o custo de um costume em diamantes
 * 
 * @param {number} costumeId - ID do costume
 * @returns {number} Custo em diamantes (default 5 se não especificado)
 */
export function getCostumeCost(costumeId) {
  return COSTUME_COSTS[costumeId] || 5;
}

/**
 * Gera o pacote de costume shop para enviar ao cliente
 * 
 * @param {Object} player - Objeto do jogador
 * @param {Object} user - Objeto do usuário (com dados de costume)
 * @returns {Array} Array de pacotes para enviar ao cliente
 * 
 * Este pacote contém o template fx_tpl com todo o código JavaScript
 * necessário para renderizar a loja de costumes no cliente.
 */
export function makeCostumeShopPacket(player, user) {
  // Código JavaScript do costume shop (escapado para JSON)
  // Este código será executado no cliente para criar a UI da loja
  const costumeShopCode = `{sound: -1,x: 39,y: 26,dir: 0,template: 'costume_shop',base_template: 'costume_shop',start: function()\\r\\n{\\r\\n    var dlg = jv.dialog_costume;\\r\\n    if(!dlg)\\r\\n    {\\r\\n        var elem;\\r\\n        dlg = jv.dialog_costume = make_dialog(360,260," - Costume Shop - ");\\r\\n\\r\\n        dlg.costume = 1;\\r\\n        elem = dlg.heading = make_label("# 0"); elem.top(36); elem.center();\\r\\n        elem = dlg.notice = make_label(" ",{style:{font : '10px Verdana', fill:0xFFCCCC}}); elem.bottom(86); elem.center();\\r\\n\\r\\n        elem = dlg.percent = make_label((jv.costume_percent || 0)+"%"); elem.top(36); elem.left(60);\\r\\n\\r\\n        elem = dlg.diamonds = make_label(jv.premium || '0',{style:{font : '11px Verdana', fill:0xEEEEBB}}); elem.top(38); elem.right(100);\\r\\n        elem.icon = jv.sprite(items[47%16][Math.floor(47/16)]); elem.icon.x+=24; elem.icon.y-=2; elem.icon.scale.x=0.5; elem.icon.scale.y=0.5; elem.addChild(elem.icon); \\r\\n        \\r\\n        elem = dlg.left_button = make_button(" < ",{width:40}); elem.bottom(10); elem.left(18);\\r\\n        elem.on_click = function(){\\r\\n            if(dlg.costume === 0) return;\\r\\n            dlg.costume--;\\r\\n            dlg.costume_dir = 2;\\r\\n            dlg.update();\\r\\n            dlg.costume_slider.set_percent(Math.round((dlg.costume/(monster.length-1)) * 100));\\r\\n            dlg.notice.text = ' ';\\r\\n        }\\r\\n        elem = dlg.right_button = make_button(" > ",{width:40}); elem.bottom(10); elem.right(18);\\r\\n        elem.on_click = function(){\\r\\n            if(dlg.costume === monster.length-1) return;\\r\\n            dlg.costume++;\\r\\n            dlg.costume_dir = 2;\\r\\n            dlg.update();\\r\\n            dlg.costume_slider.set_percent(Math.round((dlg.costume/(monster.length-1)) * 100));\\r\\n            dlg.notice.text = ' ';\\r\\n        }\\r\\n\\r\\n        elem = dlg.try_button = make_button(" Try it on ",{width:70}); elem.bottom(56); elem.right(8);\\r\\n        elem.on_click = function(){\\r\\n            send({ type:'c', r:'cbh', c: jv.dialog_costume.costume });\\r\\n            this.visible = 0;\\r\\n        }\\r\\n        \\r\\n        elem = dlg.apply_button = make_button(" Buy This for 2 ",{width:160}); elem.bottom(56); elem.center();\\r\\n        elem.on_click = function(){\\r\\n            send({ type:'c', r:'cb', c: jv.dialog_costume.costume });\\r\\n            this.enable(0);\\r\\n        }\\r\\n        elem.icon = jv.sprite(items[47%16][Math.floor(47/16)]); elem.icon.x+=128; elem.icon.y+=5; elem.icon.scale.x=0.5; elem.icon.scale.y=0.5; elem.addChild(elem.icon); \\r\\n        \\r\\n        dlg.costume_dir = 2;\\r\\n        dlg.costume_frame = 1;\\r\\n        dlg.costume_sprite = jv.sprite(monster[1][0][0]); \\r\\n        dlg.costume_sprite.x=180; \\r\\n        dlg.costume_sprite.y=56; \\r\\n        dlg.costume_sprite.scale.x=1; \\r\\n        dlg.costume_sprite.scale.y=1; \\r\\n        dlg.addChild(dlg.costume_sprite); \\r\\n\\r\\n        dlg.costume_right = jv.sprite(monster[1][0][0]); \\r\\n        dlg.costume_right.x=280; \\r\\n        dlg.costume_right.y=56; \\r\\n        dlg.costume_right.scale.x=1; \\r\\n        dlg.costume_right.scale.y=1; \\r\\n        dlg.costume_right.alpha=0.35; \\r\\n        dlg.addChild(dlg.costume_right); \\r\\n\\r\\n        dlg.costume_left = jv.sprite(monster[1][0][0]); \\r\\n        dlg.costume_left.x=280; \\r\\n        dlg.costume_left.y=56; \\r\\n        dlg.costume_left.scale.x=1; \\r\\n        dlg.costume_left.scale.y=1; \\r\\n        dlg.costume_left.alpha=0.35; \\r\\n        dlg.addChild(dlg.costume_left);\\r\\n        \\r\\n        elem = dlg.costume_slider = make_slider({width:230}); elem.bottom(14); elem.center();\\r\\n        elem.onChange = function(){ \\r\\n            dlg.costume = Math.round((this.percent/100) * (monster.length-1)); \\r\\n            dlg.costume_dir = 2;\\r\\n            dlg.update();\\r\\n            dlg.notice.text = ' ';\\r\\n        };\\r\\n\\r\\n        dlg.update = function()\\r\\n        {\\r\\n            let dlg = jv.dialog_costume;\\r\\n\\r\\n            var tier = 1;\\r\\n            if(jv.costume_percent >= 100) tier = 10;\\r\\n            else if(jv.costume_percent >= 90) tier = 9;\\r\\n            else if(jv.costume_percent >= 80) tier = 8;\\r\\n            else if(jv.costume_percent >= 70) tier = 7;\\r\\n            else if(jv.costume_percent >= 60) tier = 6;\\r\\n            else if(jv.costume_percent >= 45) tier = 5;\\r\\n            else if(jv.costume_percent >= 30) tier = 4;\\r\\n            else if(jv.costume_percent >= 15) tier = 3;\\r\\n            else if(jv.costume_percent >= 5) tier = 2;\\r\\n\\t\\t\\tdlg.percent.text = (jv.costume_percent || 0)+'% (Tier '+tier+')';\\r\\n\\r\\n            if(dlg.costume === 0)\\r\\n                dlg.heading.text = ' ';\\r\\n            else\\r\\n                dlg.heading.text = '# '+dlg.costume;\\r\\n            if(dlg.costume === 0)\\r\\n            {\\r\\n                dlg.apply_button.set_text('Remove costume');\\r\\n                dlg.apply_button.icon.visible = 0;\\r\\n            }\\r\\n            else if(jv.costumes.indexOf(dlg.costume) !== -1)\\r\\n            {\\r\\n                dlg.apply_button.set_text('Apply this costume');\\r\\n                dlg.apply_button.icon.visible = 0;\\r\\n\\r\\n                dlg.try_button.visible = 0;\\r\\n            }\\r\\n            else\\r\\n            {\\r\\n                let cost = jv.costume_list[dlg.costume] || 5;\\r\\n                dlg.apply_button.set_text(' Buy this for '+cost+' ');\\r\\n                dlg.apply_button.icon.visible = 1;\\r\\n\\r\\n                dlg.try_button.visible = (cost <= 60 || jv.premium >= cost );\\r\\n            }\\r\\n\\r\\n            if(dlg.costume)\\r\\n            {\\r\\n                dlg.costume_sprite.visible = 1;\\r\\n                dlg.costume_sprite.texture = monster[dlg.costume][dlg.costume_frame][dlg.costume_dir];\\r\\n                dlg.costume_sprite.x = dlg.w/2 - dlg.costume_sprite.width/2;\\r\\n                dlg.costume_sprite.y = dlg.h/2 - dlg.costume_sprite.height/2 - 24;\\r\\n                if(jv.costumes.indexOf(dlg.costume) == -1 && jv.premium < (jv.costume_list[dlg.costume] || 5))\\r\\n                    dlg.costume_sprite.tint = 0x000000;\\r\\n                else\\r\\n                    dlg.costume_sprite.tint = 0xFFFFFF;\\r\\n\\r\\n                if( (jv.costume_list[dlg.costume] || 5) <= 60) dlg.costume_sprite.tint = 0xFFFFFF;\\r\\n                    \\r\\n            }\\r\\n            else dlg.costume_sprite.visible = 0;\\r\\n\\r\\n            if(dlg.costume < monster.length-1)\\r\\n            {\\r\\n                dlg.costume_right.visible = 1;\\r\\n                dlg.costume_right.texture = monster[dlg.costume+1][dlg.costume_frame][dlg.costume_dir];\\r\\n                dlg.costume_right.x = dlg.w/2 - dlg.costume_right.width/2 + 100;\\r\\n                dlg.costume_right.y = dlg.h/2 - dlg.costume_right.height/2 - 24;\\r\\n                if(jv.costumes.indexOf(dlg.costume+1) == -1 && jv.premium < (jv.costume_list[dlg.costume+1] || 5)) \\r\\n                    dlg.costume_right.tint = 0x000000;\\r\\n                else \\r\\n                    dlg.costume_right.tint = 0xFFFFFF;\\r\\n            }\\r\\n            else dlg.costume_right.visible = 0;\\r\\n\\r\\n            if(dlg.costume > 1)\\r\\n            {\\r\\n                dlg.costume_left.visible = 1;\\r\\n                dlg.costume_left.texture = monster[dlg.costume-1][dlg.costume_frame][dlg.costume_dir];\\r\\n                dlg.costume_left.x = dlg.w/2 - dlg.costume_left.width/2 - 100;\\r\\n                dlg.costume_left.y = dlg.h/2 - dlg.costume_left.height/2 - 24;\\r\\n                if(jv.costumes.indexOf(dlg.costume-1) == -1 && jv.premium < (jv.costume_list[dlg.costume-1] || 5)) \\r\\n                    dlg.costume_left.tint = 0x000000;\\r\\n                else \\r\\n                    dlg.costume_left.tint = 0xFFFFFF;\\r\\n            }\\r\\n            else dlg.costume_left.visible = 0;\\r\\n        }\\r\\n        dlg.update();\\r\\n        dlg.costume_slider.set_percent(Math.round((dlg.costume/(monster.length-1)) * 100));\\r\\n    }\\r\\n\\r\\n    if(!jv.dialog_costume.costume_anim)\\r\\n    {\\r\\n        jv.dialog_costume.costume_anim = setInterval(function(){\\r\\n            let dlg = jv.dialog_costume;\\r\\n            dlg.costume_frame++;\\r\\n            if(dlg.costume_frame > 2)\\r\\n            {\\r\\n                dlg.costume_frame = 0;\\r\\n                dlg.costume_dir++;\\r\\n                if(dlg.costume_dir > 3)\\r\\n                    dlg.costume_dir = 0;\\r\\n            }\\r\\n            if(!jv.dialog_costume.visible)\\r\\n            {\\r\\n                clearInterval(jv.dialog_costume.costume_anim);\\r\\n                delete jv.dialog_costume.costume_anim;\\r\\n                jv.dialog_costume.notice.text = ' ';\\r\\n            }\\r\\n            else\\r\\n                dlg.update();\\r\\n        },500);\\r\\n    }\\r\\n\\r\\n    dlg.show();\\r\\n},run: function()\\r\\n{\\r\\n},move: function(p)\\r\\n{\\r\\n}}`;

  // Retorna array de pacotes como esperado pelo cliente
  return [
    // Pacote 1: Template do costume shop (fx_tpl)
    JSON.stringify({
      type: 'fx_tpl',
      tpl: 'costume_shop',
      code: costumeShopCode
    }),
    
    // Pacote 2: Criação do objeto costume_shop no mapa (fx)
    JSON.stringify({
      type: 'fx',
      tpl: 'costume_shop',
      x: 39,
      y: 26,
      s: -1,
      d: 0
    })
  ];
}

/**
 * Envia dados de costumes para o cliente
 * 
 * @param {Object} player - Objeto do jogador
 * @param {Object} user - Objeto do usuário (com dados de costume)
 * @returns {Object} Pacote de costumes para enviar ao cliente
 * 
 * Este pacote sincroniza a lista de costumes desbloqueados e os custos
 * com o cliente.
 */
export function makeCostumeDataPacket(user) {
  return {
    type: 'costumes',
    c: user.costumes || [],
    l: COSTUME_COSTS,
    p: user.costumePercent || 0
  };
}

/**
 * Processa compra de costume
 * 
 * @param {Object} user - Objeto do usuário
 * @param {number} costumeId - ID do costume a comprar
 * @returns {Object} Resultado da compra { success: boolean, message: string, premium?: number }
 */
export async function buyCostume(user, costumeId) {
  // Valida ID do costume
  if (!Number.isInteger(costumeId) || costumeId < 0 || costumeId > MAX_COSTUMES) {
    return { success: false, message: 'Invalid costume ID' };
  }
  
  // Costume 0 = remover costume (sempre permitido)
  if (costumeId === 0) {
    return { success: true, message: 'Costume removed', premium: user.premium || 0 };
  }
  
  // Verifica se o usuário já tem esse costume
  const costumes = user.costumes || [];
  if (costumes.includes(costumeId)) {
    return { success: true, message: 'Costume already owned', premium: user.premium || 0 };
  }
  
  // Verifica custo e se o usuário tem diamantes suficientes
  const cost = getCostumeCost(costumeId);
  const premium = user.premium || 0;
  
  if (premium < cost) {
    return { 
      success: false, 
      message: `Not enough diamonds. Need ${cost}, have ${premium}`,
      premium: premium
    };
  }
  
  // Deduz diamantes e adiciona costume
  // Nota: A dedução de diamantes precisa ser feita no User model
  // Por enquanto, retornamos sucesso e deixamos o messageRouter lidar com isso
  
  return {
    success: true,
    message: `Costume ${costumeId} purchased for ${cost} diamonds`,
    costumeId: costumeId,
    cost: cost,
    premium: premium
  };
}
