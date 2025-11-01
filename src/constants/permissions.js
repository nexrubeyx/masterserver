/**
 * Sistema de Permissões - Níveis de Acesso
 * 
 * Este módulo define os níveis de permissão do sistema:
 * - PLAYER (1): Jogador normal (padrão)
 * - CM (2): Community Manager
 * - GM (3): Game Master
 * - MASTER (4): Administrador máximo
 * 
 * Uso:
 * - hasPermission(user, PERMISSIONS.GM) - verifica se tem permissão GM ou superior
 * - permissionName(user.permission) - retorna o nome da permissão
 */

// Sistema de permissões (numérico)
// 1 = PLAYER, 2 = CM, 3 = GM, 4 = MASTER
export const PERMISSIONS = Object.freeze({
  PLAYER: 1,
  CM: 2,
  GM: 3,
  MASTER: 4,
});

/**
 * Verifica se o usuário tem pelo menos o nível solicitado
 * 
 * @param {Object} user - Documento do usuário
 * @param {number} minLevel - Nível mínimo requerido
 * @returns {boolean} true se tem permissão suficiente
 * 
 * Exemplo:
 * - hasPermission(user, PERMISSIONS.GM) retorna true se user.permission >= 3
 * - Se permission não estiver definido, assume PLAYER (1)
 */
export function hasPermission(user, minLevel) {
  const lvl = typeof user?.permission === 'number' ? user.permission : PERMISSIONS.PLAYER;
  return lvl >= minLevel;
}

/**
 * Retorna o nome da permissão baseado no nível
 * 
 * @param {number} level - Nível de permissão (1-4)
 * @returns {string} Nome da permissão ('PLAYER', 'CM', 'GM', 'MASTER')
 */
export function permissionName(level) {
  switch (level) {
    case PERMISSIONS.MASTER: return 'MASTER';
    case PERMISSIONS.GM: return 'GM';
    case PERMISSIONS.CM: return 'CM';
    case PERMISSIONS.PLAYER:
    default: return 'PLAYER';
  }
}
