/**
 * Costume Service - Gerenciamento de Sistema de Fantasias/Costumes
 * 
 * Este módulo gerencia o sistema de costumes (fantasias) do jogo,
 * incluindo a loja de costumes, compra, e tentativa de costumes.
 */

import { addCostumeToUser, getUserCostumeData } from '../models/User.js';
import { MAX_COSTUMES } from '../constants/costume.js';

/**
 * Configuração de costumes
 * Define custos em diamantes para cada costume
 */
const COSTUME_COSTS = {
  1: 2, 2: 10, 3: 5, 4: 5, 5: 15, 6: 2, 7: 15, 8: 10, 9: 20, 10: 20,
  11: 10, 12: 10, 13: 15, 14: 10, 15: 2, 16: 20, 17: 10, 18: 10, 19: 20, 20: 10,
  21: 10, 22: 20, 23: 2, 24: 5, 25: 10, 26: 45, 27: 300, 28: 20, 29: 20, 30: 50,
  31: 15, 32: 40, 33: 40, 34: 60, 35: 75, 36: 2, 37: 10, 38: 20, 39: 40, 40: 60,
  41: 15, 42: 20, 43: 20, 44: 40, 45: 40, 46: 15, 47: 10, 48: 20, 49: 40, 50: 15,
  51: 40, 52: 40, 53: 20, 54: 40, 55: 45, 56: 15, 57: 50, 58: 45, 59: 100, 60: 40,
  61: 10, 62: 50, 63: 45, 64: 50, 65: 50, 66: 100, 67: 20, 68: 20, 69: 20, 70: 50,
  71: 40, 72: 10, 73: 40, 74: 60, 75: 20, 76: 80, 77: 250, 78: 999, 79: 10, 80: 2,
  81: 15, 82: 15, 83: 5, 84: 20, 85: 80, 86: 60, 87: 150, 88: 40, 89: 5, 90: 15,
  91: 5, 92: 15, 93: 20, 94: 40, 95: 20, 96: 50, 97: 55, 98: 60, 99: 75, 100: 50,
  101: 45, 102: 40, 103: 5, 104: 10, 105: 15, 106: 2, 107: 40, 108: 60, 109: 5, 110: 25,
  111: 2, 112: 10, 113: 15, 114: 5, 115: 40, 116: 2, 117: 40, 118: 50, 119: 80, 120: 20,
  121: 80, 122: 120, 123: 50, 124: 20, 125: 50, 126: 40, 127: 40, 128: 80, 129: 500, 130: 300,
  131: 20, 132: 20, 133: 20, 134: 20, 135: 20, 136: 700, 137: 50, 138: 250, 139: 60, 140: 50,
  141: 80, 142: 250, 143: 60, 144: 300, 145: 90, 146: 90, 147: 60, 148: 150
};

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
