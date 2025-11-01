/**
 * Example: Using Permission System in Command Handlers
 * 
 * This file demonstrates how to use the permission system to restrict
 * access to commands based on user permission levels.
 * 
 * NOTE: This is an example file for documentation purposes.
 * Place actual permission checks in your message router or command handlers.
 */

import { PERMISSIONS, hasPermission, permissionName } from '../constants/permissions.js';

/**
 * Example: Admin-only command handler
 * 
 * This command can only be executed by users with GM or higher permission.
 */
export function handleAdminCommand(session, command, world) {
  // Check if user has at least GM permission (level 3)
  if (!hasPermission(session.user, PERMISSIONS.GM)) {
    // User doesn't have permission - send error message
    world.sendTo(session.player, {
      type: 'err',
      msg: 'Permissão insuficiente. Este comando requer GM ou superior.'
    });
    return;
  }

  // User has permission - execute the admin command
  world.logger.info(
    { user: session.user.username, permission: session.user.permission },
    'Admin command executed'
  );
  
  // ... execute command logic here ...
}

/**
 * Example: Teleport command with permission levels
 * 
 * - PLAYER (1): Can only teleport to spawn points
 * - CM (2): Can teleport anywhere on current map
 * - GM (3): Can teleport to any map
 * - MASTER (4): Can teleport anyone anywhere
 */
export function handleTeleportCommand(session, targetMap, x, y, world) {
  const userLevel = session.user.permission || PERMISSIONS.PLAYER;
  
  // Check basic teleport permission
  if (userLevel < PERMISSIONS.CM) {
    world.sendTo(session.player, {
      type: 'err',
      msg: 'Você não tem permissão para se teleportar.'
    });
    return;
  }
  
  // Check cross-map teleport permission
  if (targetMap !== session.player.mapId && userLevel < PERMISSIONS.GM) {
    world.sendTo(session.player, {
      type: 'err',
      msg: 'Apenas GMs podem se teleportar entre mapas.'
    });
    return;
  }
  
  // Perform teleport
  session.player.mapId = targetMap;
  session.player.x = x;
  session.player.y = y;
  
  world.sendTo(session.player, {
    type: 'logmsg',
    text: `Teleportado para ${targetMap} (${x}, ${y})`
  });
}

/**
 * Example: Get user info command
 * 
 * Shows how to display permission level to users.
 */
export function handleUserInfoCommand(session, world) {
  const userLevel = session.user.permission || PERMISSIONS.PLAYER;
  const permName = permissionName(userLevel);
  
  world.sendTo(session.player, {
    type: 'logmsg',
    text: `Usuário: ${session.user.username}\nNível: ${session.player.level}\nPermissão: ${permName} (${userLevel})`
  });
}

/**
 * Example: Permission check utility
 * 
 * Helper function to check and respond to permission failures.
 */
export function requirePermission(session, minLevel, world) {
  if (!hasPermission(session.user, minLevel)) {
    const required = permissionName(minLevel);
    world.sendTo(session.player, {
      type: 'err',
      msg: `Este comando requer permissão ${required} ou superior.`
    });
    return false;
  }
  return true;
}

/**
 * Example: Using requirePermission helper
 */
export function handleKickCommand(session, targetUsername, world) {
  // Check if user has GM permission
  if (!requirePermission(session, PERMISSIONS.GM, world)) {
    return; // Permission denied, error already sent
  }
  
  // User has permission - execute kick logic
  // ... find and kick target user ...
  
  world.logger.info(
    { admin: session.user.username, target: targetUsername },
    'User kicked'
  );
}

/**
 * Example: Integrating with message router
 * 
 * Show how to add permission checks to the message router.
 */
export function exampleMessageRouter(world) {
  return async (ws, packet) => {
    const session = world.getSession(ws);
    if (!session) return;
    
    switch (packet.type) {
      case 'admin_cmd':
        // Only GM and above can use admin commands
        if (!hasPermission(session.user, PERMISSIONS.GM)) {
          world.sendRaw(ws, { type: 'err', msg: 'Acesso negado.' });
          return;
        }
        // Process admin command
        break;
        
      case 'chat':
        // Everyone can chat, but check for muted status (future feature)
        // processChat(session, packet.text);
        break;
        
      case 'give_item':
        // Only CMs and above can give items
        if (!hasPermission(session.user, PERMISSIONS.CM)) {
          world.sendRaw(ws, { type: 'err', msg: 'Acesso negado.' });
          return;
        }
        // Process item giving
        break;
    }
  };
}
