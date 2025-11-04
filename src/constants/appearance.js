/**
 * Constantes de Aparência - Roupas e Cores Disponíveis
 * 
 * Este módulo define todas as roupas (clothes, body, hair) e cores
 * disponíveis no servidor, divididas em FREE (gratuitas) e PREMIUM.
 * 
 * FREE: Disponíveis para todos os jogadores
 * PREMIUM: Disponíveis apenas para jogadores com premium ativo
 * 
 * Isso impede que jogadores usem roupas/cores que não existem no servidor
 * e garante que apenas premium players tenham acesso a itens exclusivos.
 */

// Cores padrão (usadas em múltiplos lugares)
export const DEFAULT_HAIR_COLOR = 6504471;
export const DEFAULT_CLOTHES_COLOR = 14540253;
export const DEFAULT_EYE_COLOR = 9682175;
export const DEFAULT_NAME_COLOR = 16777215;

/**
 * Roupas (clothes) gratuitas disponíveis para todos
 * Estendido até 148 para cobrir todos os costumes no cliente
 */
export const FREE_CLOTHES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
  51, 52, 53, 54, 55, 56, 57, 58, 59, 60,
  61, 62, 63, 64, 65, 66, 67, 68, 69, 70,
  71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
  81, 82, 83, 84, 85, 86, 87, 88, 89, 90,
  91, 92, 93, 94, 95, 96, 97, 98, 99, 100,
  101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
  111, 112, 113, 114, 115, 116, 117, 118, 119, 120,
  121, 122, 123, 124, 125, 126, 127, 128, 129, 130,
  131, 132, 133, 134, 135, 136, 137, 138, 139, 140,
  141, 142, 143, 144, 145, 146, 147, 148
];

/**
 * Roupas (clothes) premium - requerem premium ativo
 * Removido pois todas as roupas agora estão disponíveis gratuitamente
 */
export const PREMIUM_CLOTHES = [];

/**
 * Corpos (body) gratuitos disponíveis para todos
 */
export const FREE_BODY = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10
];

/**
 * Corpos (body) premium - requerem premium ativo
 */
export const PREMIUM_BODY = [
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20
];

/**
 * Cabelos (hair) gratuitos disponíveis para todos
 */
export const FREE_HAIR = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25
];

/**
 * Cabelos (hair) premium - requerem premium ativo
 */
export const PREMIUM_HAIR = [
  26, 27, 28, 29, 30, 31, 32, 33, 34, 35,
  36, 37, 38, 39, 40
];

/**
 * Cores gratuitas disponíveis para todos
 * Valores RGB em decimal (0x000000 a 0xFFFFFF = 0 a 16777215)
 * 
 * Nota: Algumas cores (como prata/silver) aparecem em ambas as listas
 * FREE e PREMIUM para permitir acesso mais amplo a cores comuns.
 */
export const FREE_COLORS = [
  0xFFFFFF,   // Branco
  0x000000,   // Preto
  0xFF0000,   // Vermelho
  0x00FF00,   // Verde
  0x0000FF,   // Azul
  0xFFFF00,   // Amarelo
  0xFF00FF,   // Magenta
  0x00FFFF,   // Ciano
  0x808080,   // Cinza
  0xC0C0C0,   // Prata (também disponível em premium para flexibilidade)
  0x800000,   // Marrom escuro
  0x808000,   // Oliva
  0x008000,   // Verde escuro
  0x800080,   // Roxo
  0x008080,   // Verde-azulado
  0x000080,   // Azul marinho
  0xFFA500,   // Laranja
  0xFFC0CB,   // Rosa
  0xA52A2A,   // Marrom
  0xD2691E,   // Chocolate
  DEFAULT_HAIR_COLOR,    // Cor padrão cabelo
  DEFAULT_CLOTHES_COLOR, // Cor padrão roupa
  DEFAULT_EYE_COLOR,     // Cor padrão olhos
  DEFAULT_NAME_COLOR     // Cor padrão nome
];

/**
 * Cores premium - requerem premium ativo
 * 
 * NOTA IMPORTANTE: Algumas cores (como 0xC0C0C0 - Silver) aparecem em ambas as listas
 * FREE e PREMIUM. Isso é INTENCIONAL e permite que:
 * 1. Jogadores free tenham acesso a cores comuns/básicas como prata
 * 2. A validação funciona corretamente: isColorAllowed() retorna true para free players
 * 
 * A duplicação não causa problemas porque a função de validação verifica FREE_COLORS
 * primeiro, então jogadores free podem usar essas cores sem precisar de premium.
 * 
 * Se no futuro quisermos tornar prata exclusiva para premium, basta removê-la de FREE_COLORS.
 */
export const PREMIUM_COLORS = [
  0xFFD700,   // Ouro
  0xC0C0C0,   // Prata (também em FREE_COLORS - ver nota acima)
  0xCD7F32,   // Bronze
  0xFF1493,   // Rosa profundo
  0x4B0082,   // Indigo
  0x9400D3,   // Violeta
  0x00CED1,   // Turquesa escuro
  0xFF6347,   // Tomate
  0x40E0D0,   // Turquesa
  0xEE82EE,   // Violeta claro
  0xF0E68C,   // Khaki
  0xE6E6FA,   // Lavanda
  0xFFF0F5,   // Lavanda corado
  0x7FFFD4,   // Água-marinha
  0xF5DEB3,   // Trigo
  0xF5F5DC,   // Bege
  0xFAF0E6,   // Linho
  0xFFE4E1,   // Rosa névoa
  0xFFDAB9,   // Pêssego
  0xFFEBCD    // Amêndoa
];

/**
 * Valida se uma roupa (clothes) é permitida para o jogador
 * 
 * @param {number} clothes - ID da roupa
 * @param {boolean} isPremium - Se o jogador tem premium
 * @returns {boolean} true se permitido, false caso contrário
 */
export function isClothesAllowed(clothes, isPremium) {
  if (FREE_CLOTHES.includes(clothes)) return true;
  if (isPremium && PREMIUM_CLOTHES.includes(clothes)) return true;
  return false;
}

/**
 * Valida se um corpo (body) é permitido para o jogador
 * 
 * @param {number} body - ID do corpo
 * @param {boolean} isPremium - Se o jogador tem premium
 * @returns {boolean} true se permitido, false caso contrário
 */
export function isBodyAllowed(body, isPremium) {
  if (FREE_BODY.includes(body)) return true;
  if (isPremium && PREMIUM_BODY.includes(body)) return true;
  return false;
}

/**
 * Valida se um cabelo (hair) é permitido para o jogador
 * 
 * @param {number} hair - ID do cabelo
 * @param {boolean} isPremium - Se o jogador tem premium
 * @returns {boolean} true se permitido, false caso contrário
 */
export function isHairAllowed(hair, isPremium) {
  if (FREE_HAIR.includes(hair)) return true;
  if (isPremium && PREMIUM_HAIR.includes(hair)) return true;
  return false;
}

/**
 * Valida se uma cor é permitida para o jogador
 * 
 * @param {number} color - Cor em RGB decimal (0-16777215)
 * @param {boolean} isPremium - Se o jogador tem premium
 * @returns {boolean} true se permitido, false caso contrário
 */
export function isColorAllowed(color, isPremium) {
  if (FREE_COLORS.includes(color)) return true;
  if (isPremium && PREMIUM_COLORS.includes(color)) return true;
  return false;
}

/**
 * Verifica se o jogador tem premium ativo
 * 
 * @param {Object} player - Objeto do jogador
 * @returns {boolean} true se o jogador tem premium ativo (premium > 0)
 */
export function hasActivePremium(player) {
  return (player?.premium || 0) > 0;
}

/**
 * Valida todas as mudanças de aparência solicitadas
 * 
 * @param {Object} changes - Mudanças solicitadas { body?, hair?, clothes?, hairColor?, clothesColor?, eyeColor? }
 * @param {boolean} isPremium - Se o jogador tem premium
 * @returns {Object} { valid: boolean, reason?: string }
 */
export function validateAppearanceChanges(changes, isPremium) {
  // Valida body se fornecido
  if (changes.body !== undefined && !isBodyAllowed(changes.body, isPremium)) {
    return { 
      valid: false, 
      reason: isPremium ? 'Invalid body ID' : 'Body requires premium or is not available'
    };
  }
  
  // Valida hair se fornecido
  if (changes.hair !== undefined && !isHairAllowed(changes.hair, isPremium)) {
    return { 
      valid: false, 
      reason: isPremium ? 'Invalid hair ID' : 'Hair requires premium or is not available'
    };
  }
  
  // Valida clothes se fornecido
  if (changes.clothes !== undefined && !isClothesAllowed(changes.clothes, isPremium)) {
    return { 
      valid: false, 
      reason: isPremium ? 'Invalid clothes ID' : 'Clothes requires premium or is not available'
    };
  }
  
  // Valida cores se fornecidas
  if (changes.hairColor !== undefined && !isColorAllowed(changes.hairColor, isPremium)) {
    return { 
      valid: false, 
      reason: isPremium ? 'Invalid hair color' : 'Hair color requires premium or is not available'
    };
  }
  
  if (changes.clothesColor !== undefined && !isColorAllowed(changes.clothesColor, isPremium)) {
    return { 
      valid: false, 
      reason: isPremium ? 'Invalid clothes color' : 'Clothes color requires premium or is not available'
    };
  }
  
  if (changes.eyeColor !== undefined && !isColorAllowed(changes.eyeColor, isPremium)) {
    return { 
      valid: false, 
      reason: isPremium ? 'Invalid eye color' : 'Eye color requires premium or is not available'
    };
  }
  
  return { valid: true };
}
