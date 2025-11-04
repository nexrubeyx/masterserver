/**
 * Recipe Service - Gerenciamento de Receitas de Crafting
 * 
 * Este módulo gerencia as receitas (recipes) e dados de construção (build data)
 * que são enviados ao cliente para o sistema de crafting.
 * 
 * Estrutura de uma receita:
 * {
 *   [recipeName]: {
 *     r: {                    // requirements (requisitos)
 *       [itemName]: quantity  // nome do item requerido e quantidade
 *     }
 *   }
 * }
 * 
 * Exemplo:
 * {
 *   "campfire": {
 *     r: {
 *       "wood": 5,
 *       "stone": 3
 *     }
 *   }
 * }
 */

/**
 * Dados de receitas/construção
 * 
 * Array de receitas do jogo com suas requirements, sprites e informações.
 * 
 * Estrutura de cada receita:
 * - t: template name (identificador único da receita)
 * - r: requirements (objeto com itens requeridos e quantidades)
 * - s: sprite ID (ID do sprite visual)
 * - n: name (nome exibido da receita)
 * - p: portable (1 = portável, 0 = não portável/estrutura)
 * - c: category (opcional, categoria da receita como "knit")
 */
const recipeData = [
  {"t":"protection_potion","r":{"turtle_shell":1,"berry":5,"pelt":3},"s":323,"n":"Protection Potion","p":1},
  {"t":"aloe_potion","r":{"silver":1,"aloe_plant":3,"mud":1},"s":242,"n":"Healing Potion","p":1},
  {"t":"animal_gate","r":{"wood":20},"s":949,"n":"Animal Gate","p":0},
  {"t":"antidote","r":{"silver":10,"aloe_potion":1,"poison_extract":10},"s":324,"n":"Antidote","p":1},
  {"t":"arena_ticket","r":{"swampgrass":50,"brown_liquid":1,"orc_glass":1,"blank_paper":1},"s":465,"n":"Arena Ticket","p":1},
  {"t":"bandage","r":{"yarn":10,"aloe_plant":20},"s":826,"n":"Bandage","p":1,"c":"knit"},
  {"t":"basic_gate","r":{"stone":10,"wood":20,"silver":1},"s":881,"n":"Personal Gate","p":0},
  {"t":"bed","r":{"wood":20,"feather":4,"wool":4},"s":958,"n":"Bed","p":0},
  {"t":"bellows","r":{"wood":30,"silver":5,"hide":6},"s":784,"n":"Bellows","p":0},
  {"t":"bishops_cloak","r":{"yarn":15,"red_dye":1,"silver":2},"s":742,"n":"Bishop's Cloak","p":1,"c":"knit"},
  {"t":"blank_paper","r":{"pelt":1,"tinder":1,"silver":1},"s":618,"n":"Blank Paper","p":1},
  {"t":"bloomery","r":{"stone":250,"clay":150,"charcoal":8,"silver":10},"s":817,"n":"Bloomery","p":0},
  {"t":"blue_ring","r":{"hematite":5,"silver":1},"s":290,"n":"Journeyman's Ring","p":1},
  {"t":"bone_armor","r":{"bone":40,"hide":4},"s":696,"n":"Bone Armor","p":1},
  {"t":"bone_axe","r":{"wood":10,"bone":25},"s":717,"n":"Bone Axe","p":1},
  {"t":"bone_dagger","r":{"wood":5,"bone":6},"s":705,"n":"Bone Dagger","p":1},
  {"t":"bone_hammer","r":{"wood":20,"bone":15},"s":580,"n":"Bone Hammer","p":1},
  {"t":"bone_knuckles","r":{"bone":10,"silver":2},"s":605,"n":"Bone Knuckles","p":1},
  {"t":"bone_pickaxe","r":{"wood":5,"bone":12},"s":715,"n":"Bone Pickaxe","p":1},
  {"t":"bone_shield","r":{"bone":75},"s":293,"n":"Bone Shield","p":1},
  {"t":"bone_spear","r":{"wood":15,"bone":8},"s":706,"n":"Bone Spear","p":1},
  {"t":"bone_sword","r":{"stone":10,"bone":35},"s":697,"n":"Bone Sword","p":1},
  {"t":"bowmans_scarf","r":{"yarn":10,"yellow_dye":1,"blue_dye":1,"gold":2},"s":294,"n":"Bowman's Scarf","p":1,"c":"knit"},
  {"t":"bronze_axe","r":{"wood":10,"bronze":20,"clay":10},"s":734,"n":"Bronze Axe","p":1},
  {"t":"bronze_dagger","r":{"wood":5,"bronze":9,"clay":4},"s":732,"n":"Bronze Dagger","p":1},
  {"t":"bronze_hammer","r":{"wood":20,"bronze":60,"citrine":10,"garnet":10,"aquamarine":10},"s":787,"n":"Bronze Hammer","p":1},
  {"t":"bronze_pickaxe","r":{"wood":10,"bronze":20,"clay":10},"s":738,"n":"Bronze Pickaxe","p":1},
  {"t":"bronze_plate_armor","r":{"bronze":60,"red_dye":10},"s":529,"n":"Bronze Plate Armor","p":1},
  {"t":"bronze_shield","r":{"bronze":40,"wood":10,"clay":10},"s":739,"n":"Bronze Shield","p":1},
  {"t":"bronze_spear","r":{"wood":15,"bronze":12,"clay":2},"s":733,"n":"Bronze Spear","p":1},
  {"t":"bronze_splint_mail","r":{"bronze":80,"hematite":40},"s":261,"n":"Bronze Splint Mail","p":1},
  {"t":"bronze_sword","r":{"wood":5,"bronze":20,"clay":4},"s":735,"n":"Bronze Sword","p":1},
  {"t":"candlestick","r":{"gold":5,"bronze":20,"flint":5},"s":-432,"n":"Golden Candlestick","p":0},
  {"t":"chain_whip","r":{"steel":40,"bronze":40,"sapphire":40},"s":794,"n":"Chain Whip","p":1},
  {"t":"chefs_charm","r":{"yarn":4,"stone":6,"gold":3,"blue_dye":2},"s":326,"n":"Chef's Charm","p":1},
  {"t":"clay_bowl","r":{"clay":10},"s":694,"n":"Clay Bowl","p":1},
  {"t":"clay_floor","r":{"clay":5},"s":824,"n":"Clay Floor Kit","p":1},
  {"t":"club","r":{"wood":15},"s":713,"n":"Club","p":1},
  {"t":"compass","r":{"wood":3,"hematite":1},"s":786,"n":"Compass","p":1},
  {"t":"cooking_pot","r":{"hematite":50,"silver":50},"s":941,"n":"Cooking Pot","p":1},
  {"t":"copper_dagger","r":{"wood":5,"copper":9,"clay":4},"s":703,"n":"Copper Dagger","p":1},
  {"t":"copper_spear","r":{"wood":15,"copper":12,"clay":2},"s":708,"n":"Copper Spear","p":1},
  {"t":"counter","r":{"wood":50,"gold":5,"silver":10},"s":-327,"n":"Trading Counter","p":0},
  {"t":"depth_recall","r":{"gold":1,"dragon_scale":1,"blue_dye":1},"s":243,"n":"Depth Recall","p":1},
  {"t":"duel_statue","r":{"gold":15,"stone":100,"bone":20},"s":-177,"n":"Duel Statue","p":0},
  {"t":"dummy","r":{"wood":50,"tinder":20,"red_dye":1},"s":-258,"n":"Training Dummy","p":0},
  {"t":"escape_rope","r":{"tinder":20,"silver":5},"s":796,"n":"Escape Rope","p":1},
  {"t":"feather_cape","r":{"feather":100,"blue_dye":10,"orc_glass":15},"s":658,"n":"Feather Cape","p":1,"c":"knit"},
  {"t":"fire","r":{"tinder":3,"flint":1,"wood":5},"s":-149,"n":"Fire","p":0},
  {"t":"fire_pit","r":{"charcoal":4,"stone":20,"flint":4,"wood":4},"s":805,"n":"Fire Pit","p":0},
  {"t":"fishing_rod","r":{"tinder":10,"wood":10,"copper":1},"s":513,"n":"Fishing Rod","p":1},
  {"t":"flint_dagger","r":{"wood":5,"flint":8},"s":718,"n":"Flint Dagger","p":1},
  {"t":"floor_trap","r":{"gold":2,"obsidian":10},"s":789,"n":"Shard Trap","p":1},
  {"t":"friar_robe","r":{"yarn":5},"s":741,"n":"Friar Robe","p":1,"c":"knit"},
  {"t":"garbage_bin","r":{"clay":20,"flint":20},"s":-361,"n":"Garbage Bin","p":0},
  {"t":"glasteel_hammer","r":{"orc_glass":20,"steel":80},"s":679,"n":"Glasteel Hammer","p":1},
  {"t":"grass_band","r":{"tinder":4},"s":69,"n":"Grass Band","p":1},
  {"t":"gravel_road","r":{"stone":5,"clay":1},"s":807,"n":"Gravel Road Kit","p":1},
  {"t":"guardian_ring","r":{"silver":4,"obsidian":7},"s":311,"n":"Guardian Ring","p":1},
  {"t":"herald_shield","r":{"wood":100,"silver":5},"s":518,"n":"Herald Shield","p":1},
  {"t":"heroic_cuirass","r":{"bronze":50,"red_dye":4,"yellow_dye":5,"blue_dye":5},"s":258,"n":"Heroic Cuirass","p":1},
  {"t":"hide_armor","r":{"hide":5,"tinder":4},"s":260,"n":"Hide Armor","p":1},
  {"t":"hoe","r":{"stone":5,"wood":5},"s":685,"n":"Hoe","p":1},
  {"t":"huntsmans_cloak","r":{"yarn":8,"blue_dye":2,"yellow_dye":2},"s":755,"n":"Hunter's Cloak","p":1,"c":"knit"},
  {"t":"iron_axe","r":{"wood":20,"bronze":10,"iron":80},"s":680,"n":"Iron Axe","p":1},
  {"t":"iron_chain_mail","r":{"iron":180,"silver":20},"s":530,"n":"Iron Chain Mail","p":1},
  {"t":"iron_dagger","r":{"iron":40,"bronze":5},"s":673,"n":"Iron Dagger","p":1},
  {"t":"iron_knuckles","r":{"iron":20,"bronze":20,"gold":5},"s":604,"n":"Iron Duster","p":1},
  {"t":"iron_mace","r":{"wood":15,"iron":140,"bronze":10,"silver":10},"s":677,"n":"Iron Mace","p":1},
  {"t":"iron_pickaxe","r":{"wood":20,"bronze":10,"iron":60},"s":681,"n":"Iron Pickaxe","p":1},
  {"t":"iron_plate_armor","r":{"iron":225,"red_dye":15,"silver":25},"s":689,"n":"Iron Plate Armor","p":1},
  {"t":"iron_shield","r":{"iron":120,"wood":20,"bronze":20,"silver":20},"s":520,"n":"Iron Shield","p":1},
  {"t":"iron_shovel","r":{"iron":50,"wood":30},"s":621,"n":"Iron Shovel","p":1},
  {"t":"iron_spear","r":{"wood":30,"iron":60},"s":683,"n":"Iron Spear","p":1},
  {"t":"iron_sword","r":{"bronze":10,"iron":100},"s":675,"n":"Iron Sword","p":1},
  {"t":"knitting_needles","r":{"wood":2},"s":690,"n":"Knitting Needles","p":1},
  {"t":"lens","r":{"copper":5,"silver":20},"s":459,"n":"Scholar's Lens","p":1},
  {"t":"light_tunic","r":{"yarn":8},"s":277,"n":"Light Tunic","p":1,"c":"knit"},
  {"t":"lock","r":{"silver":5,"copper":5},"s":890,"n":"Lock","p":1},
  {"t":"mace","r":{"wood":15,"stone":30,"hematite":30,"copper":10},"s":307,"n":"Mace","p":1},
  {"t":"mariner_garb","r":{"yarn":15,"blue_dye":2},"s":749,"n":"Mariner Garb","p":1,"c":"knit"},
  {"t":"merchant_cloak","r":{"yarn":15,"blue_dye":2,"yellow_dye":2},"s":750,"n":"Merchant Cloak","p":1,"c":"knit"},
  {"t":"mud_trap","r":{"wool":2,"mud":10},"s":-356,"n":"Mud Trap","p":1},
  {"t":"noblemans_jacket","r":{"yarn":20,"blue_dye":4},"s":748,"n":"Noble Jacket","p":1,"c":"knit"},
  {"t":"novice_bow","r":{"tinder":10,"wood":20},"s":482,"n":"Simple Bow","p":1},
  {"t":"obsidian_dagger","r":{"wood":5,"obsidian":9},"s":704,"n":"Obsidian Dagger","p":1},
  {"t":"obsidian_spear","r":{"wood":15,"obsidian":12},"s":707,"n":"Obsidian Spear","p":1},
  {"t":"orb","r":{"copper":10,"orc_glass":20,"lens":1},"s":25,"n":"Orb of Insight","p":1},
  {"t":"peddlers_gem","r":{"silver":2,"copper":5},"s":308,"n":"Peddler's Gem","p":1},
  {"t":"pelt_armor","r":{"pelt":2,"tinder":2},"s":257,"n":"Pelt Armor","p":1},
  {"t":"raft","r":{"wood":30,"tinder":20,"silver":10},"s":-486,"n":"Raft","p":1},
  {"t":"recall_tile","r":{"gold":10,"dragon_scale":1,"escape_lantern":1},"s":-239,"n":"Recall Tile","p":0},
  {"t":"repair_kit","r":{"wood":5,"flint":2,"stone":10,"clay":5},"s":719,"n":"Repair Kit","p":1},
  {"t":"sages_robe","r":{"yarn":15,"blue_dye":2},"s":753,"n":"Sage's Robe","p":1,"c":"knit"},
  {"t":"seers_robe","r":{"yarn":12},"s":752,"n":"Seer's Robe","p":1,"c":"knit"},
  {"t":"shears","r":{"tin":20,"wood":15},"s":984,"n":"Shears","p":1},
  {"t":"short_bow","r":{"tinder":15,"wood":30,"silver":5,"feather":2},"s":507,"n":"Short Bow","p":1},
  {"t":"shovel","r":{"stone":15,"wood":15},"s":686,"n":"Shovel","p":1},
  {"t":"sign","r":{"wood":20},"s":937,"n":"Signpost","p":0},
  {"t":"smithy_stone","r":{"silver":10,"tin":10,"gold":10},"s":483,"n":"Smithy Stone","p":1},
  {"t":"spiked_band","r":{"steel":60,"gold":10,"ruby":50},"s":602,"n":"Spiked Band","p":1},
  {"t":"spindle","r":{"wood":5},"s":687,"n":"Spindle","p":1},
  {"t":"stairs","r":{"stone":100,"clay":20,"gold":1},"s":-7,"n":"Stairway","p":0},
  {"t":"steel_axe","r":{"wood":40,"bronze":20,"steel":120},"s":637,"n":"Steel Axe","p":1},
  {"t":"steel_band","r":{"steel":60,"gold":10,"emerald":50},"s":603,"n":"Steel Band","p":1},
  {"t":"steel_chain_mail","r":{"steel":180,"silver":40},"s":651,"n":"Steel Chain Mail","p":1},
  {"t":"steel_dagger","r":{"steel":50,"bronze":10},"s":622,"n":"Steel Dagger","p":1},
  {"t":"steel_mace","r":{"wood":30,"steel":140,"bronze":10,"silver":20},"s":635,"n":"Steel Mace","p":1},
  {"t":"steel_pickaxe","r":{"wood":40,"bronze":20,"steel":80},"s":634,"n":"Steel Pickaxe","p":1},
  {"t":"steel_plate_armor","r":{"steel":225,"garnet":10,"silver":50},"s":652,"n":"Steel Plate Armor","p":1},
  {"t":"steel_shield","r":{"steel":120,"wood":40,"bronze":40,"silver":40},"s":650,"n":"Steel Shield","p":1},
  {"t":"steel_spear","r":{"wood":50,"steel":60},"s":638,"n":"Steel Spear","p":1},
  {"t":"steel_sword","r":{"bronze":20,"steel":100},"s":623,"n":"Steel Sword","p":1},
  {"t":"stone_anvil","r":{"stone":400,"silver":10},"s":781,"n":"Stone Anvil","p":0},
  {"t":"stone_axe","r":{"stone":20,"wood":10},"s":716,"n":"Stone Axe","p":1},
  {"t":"stone_floor","r":{"stone":15},"s":823,"n":"Stone Floor Kit","p":1},
  {"t":"stone_hammer","r":{"wood":20,"stone":30},"s":790,"n":"Stone Hammer","p":1},
  {"t":"stone_pickaxe","r":{"stone":10,"wood":5},"s":714,"n":"Stone Pickaxe","p":1},
  {"t":"stone_road","r":{"stone":20},"s":808,"n":"Stone Road Kit","p":1},
  {"t":"stone_wall","r":{"stone":30,"clay":10},"s":870,"n":"Stone Wall","p":0},
  {"t":"stout_band","r":{"silver":10,"bronze":20,"gold":2},"s":484,"n":"Stout Band","p":1},
  {"t":"sweat_catcher","r":{"yarn":10,"red_dye":4,"silver":8},"s":288,"n":"Sweat Catcher","p":1,"c":"knit"},
  {"t":"tailors_amulet","r":{"yarn":2,"wood":2,"blue_dye":1},"s":325,"n":"Tailor's Amulet","p":1},
  {"t":"tailors_jacket","r":{"yarn":15,"red_dye":1,"yellow_dye":1},"s":740,"n":"Tailor's Jacket","p":1,"c":"knit"},
  {"t":"tree_wall","r":{"stone":20,"clay":10,"dirt":10},"s":798,"n":"Walled Tree","p":0},
  {"t":"tribe_gate","r":{"stone":20,"wood":40,"gold":5,"silver":1},"s":928,"n":"Tribe Gate","p":0},
  {"t":"tribe_relic","r":{"gold":5},"s":285,"n":"Tribe Relic","p":1},
  {"t":"tribe_tower","r":{"stone":80,"obsidian":20,"gold":1},"s":-355,"n":"Arrow Tower","p":0},
  {"t":"tribe_vault","r":{"stone":20,"wood":40,"gold":10,"silver":5},"s":945,"n":"Tribe Vault","p":0},
  {"t":"troubadour_garb","r":{"yarn":15,"feather":2,"red_dye":1,"yellow_dye":2},"s":756,"n":"Troubadour Garb","p":1,"c":"knit"},
  {"t":"turtle_shield","r":{"turtle_shell":15},"s":729,"n":"Turtle Shield","p":1},
  {"t":"wanderer_garb","r":{"yarn":15,"red_dye":2},"s":751,"n":"Wanderer Garb","p":1,"c":"knit"},
  {"t":"warrior_signet","r":{"bone":4,"gold":2,"cassiterite":8},"s":309,"n":"Warrior Signet","p":1},
  {"t":"watchmans_jacket","r":{"yarn":8,"blue_dye":2},"s":754,"n":"Watcher's Jacket","p":1,"c":"knit"},
  {"t":"whip","r":{"tinder":10,"bone":10,"pelt":10},"s":793,"n":"Basic Whip","p":1},
  {"t":"wood_arrow","r":{"wood":20,"feather":1},"s":701,"n":"Arrows","p":1},
  {"t":"wood_bucket","r":{"wood":20},"s":849,"n":"Wooden Bucket","p":1},
  {"t":"wood_chair","r":{"wood":10},"s":1011,"n":"Wooden Chair","p":1},
  {"t":"wood_floor","r":{"wood":10},"s":825,"n":"Wood Floor Kit","p":1},
  {"t":"wood_hammer","r":{"wood":30},"s":557,"n":"Wooden Mallet","p":1},
  {"t":"wood_spear","r":{"wood":20},"s":556,"n":"Wooden Spear","p":1},
  {"t":"wood_sword","r":{"wood":15},"s":464,"n":"Wood Sword","p":1},
  {"t":"wood_table","r":{"wood":20},"s":995,"n":"Wooden Table","p":0},
  {"t":"wood_wall","r":{"wood":20},"s":936,"n":"Wood Wall","p":0},
  {"t":"wooden_buckler","r":{"wood":30},"s":314,"n":"Wooden Buckler","p":1}
];

/**
 * Retorna todos os dados de receitas
 * 
 * @returns {Object} Objeto com todas as receitas disponíveis
 * 
 * Este objeto é serializado como JSON e enviado ao cliente no pacote 'bld'.
 */
export function getRecipeData() {
  return recipeData;
}

/**
 * Cria um pacote de receitas para enviar ao cliente
 * 
 * @returns {Object} Pacote no formato esperado pelo cliente
 * 
 * O cliente espera receber um pacote do tipo 'bld' com um campo 'data'
 * contendo a string JSON das receitas.
 */
export function makeRecipePacket() {
  return {
    type: 'bld',
    data: JSON.stringify(recipeData)
  };
}
