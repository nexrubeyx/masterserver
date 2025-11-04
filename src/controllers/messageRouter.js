/**
 * Roteador de Mensagens - Dispatcher de Comandos do Cliente
 * 
 * Este módulo cria o roteador que processa todas as mensagens validadas
 * recebidas dos clientes e as direciona para os handlers apropriados.
 * 
 * Tipos de mensagem tratados:
 * - client: informações do cliente (versão, plataforma)
 * - login/guest: autenticação e entrada no jogo
 * - chat: mensagens de chat
 * - m: mudança de direção do personagem
 * - h: início/parada de movimento
 * - P: ping/keepalive
 * 
 * Fluxo de processamento:
 * 1. WebSocket recebe mensagem bruta
 * 2. WebSocket valida JSON e schema
 * 3. Router processa a mensagem validada
 * 4. Services executam a lógica de negócio
 * 5. World envia resposta ao cliente
 */

import { handleLoginOrCreate } from '../services/authService.js';
import { getAllTemplates, makeTemplatePacket } from '../services/templateService.js';
import { makeRecipePacket } from '../services/recipeService.js';

/**
 * Cria função roteadora de mensagens
 * 
 * @param {Object} env - Configurações do ambiente
 * @param {Object} logger - Logger para registrar eventos
 * @param {Object} world - Instância do World que gerencia o estado
 * @returns {Function} Função async (ws, packet) => void
 * 
 * A função retornada é chamada pelo WebSocket para cada mensagem
 * válida recebida de um cliente.
 */
export function createMessageRouter(env, logger, world) {
  return async (ws, packet) => {
    // Switch no tipo da mensagem para decidir como processar
    switch (packet.type) {
      
      // === INFORMAÇÕES DO CLIENTE ===
      // Primeira mensagem enviada após conectar
      case 'client': {
        // Armazena informações do cliente na conexão WebSocket
        ws._clientInfo = { 
          version: packet.ver,       // Versão do cliente (ex: '5.1.2')
          mobile: !!packet.mobile,   // Se é dispositivo móvel
          agent: packet.agent        // User agent do navegador
        };
        return;
      }

      // === AUTENTICAÇÃO E ENTRADA NO JOGO ===
      // Processa login com credenciais ou entrada como guest
      case 'login':
      case 'guest': {
        try {
          // Autentica usuário e carrega/cria personagem
          const auth = await handleLoginOrCreate(env, logger, packet);
          
          // Anexa sessão do jogador à conexão WebSocket
          world.attachSession(ws, { user: auth.user, player: auth.player });
        } catch (err) {
          // Se falhar (senha errada, etc), envia mensagem de erro
          world.sendRaw(ws, { type: 'logmsg', text: String(err.message || err) });
          return;
        }
        
        // Obtém dados da sessão criada
        const session = world.getSession(ws);
        if (!session) return; // attachSession recusou (personagem já online)
        const { player } = session;
        const m = world.mapService.getMap(player.mapId);

        // === SEQUÊNCIA DE INICIALIZAÇÃO DO CLIENTE ===
        
        // 1) Envia pacote 'accepted' - confirma login bem-sucedido
        world.sendRaw(ws, {
          type: 'accepted',
          id: String(player.sessionId),  // ID da sessão (único)
          name: player.name,             // Nome do personagem
          mw: m.width,                   // Largura do mapa
          mh: m.height,                  // Altura do mapa
          tile: {}                       // Tiles especiais (vazio por enquanto)
        });

        // 2) Cria pacotes de templates e mapa para enviar em pkg
        const allTemplates = getAllTemplates();
        const templatePackets = allTemplates.map(t => makeTemplatePacket(t));
        
        // 3) Cria pacote de informações do mapa (mt = map transition)
        const mtPacket = {
          type: 'mt',
          s: 1,                           // Status (1 = sucesso)
          m: env.DEFAULT_SONG,            // Música do mapa
          w: m.width,                     // Largura do mapa
          h: m.height,                    // Altura do mapa
          t: m.title || m.id,             // Título do mapa
          n: m.id,                        // Nome/ID do mapa
          c: env.DEFAULT_CAVE_WALL,       // Tile de parede padrão
          f: env.DEFAULT_CAVE_FLOOR       // Tile de chão padrão
        };
        
        // 4) Empacota templates e mt em um único pacote pkg
        const pkgData = [
          ...templatePackets.map(p => JSON.stringify(p)),
          JSON.stringify(mtPacket)
        ];
        
        world.sendRaw(ws, {
          type: 'pkg',
          data: JSON.stringify(pkgData)
        });

        // 5) Envia template e snapshot do próprio jogador
        // Template define aparência visual
        world.sendTo(player, world.playerService.makePlayerTemplatePacket(player));
        // Snapshot define posição e estado atual
        world.sendTo(player, world.playerService.makePlayerSnapshotPacket(player));

        // 6) Força envio do primeiro viewport (tiles visíveis)
        player._lastViewOX = undefined;
        player._lastViewOY = undefined;
        world.playerService.markViewportDirty(player);
        world.playerService.flushViewportIfDirty(player, Date.now());

 
        // 7) Envia dados de receitas/crafting (build data)
        world.sendTo(player, makeRecipePacket());
        
        // 8) Envia inventário inicial (vazio)
        world.sendTo(player, { type: 'inv', data: [] });
        
        // 9) Envia comando de música
        world.sendTo(player, { type: 'music', m: env.DEFAULT_SONG, s: 0 });

        // 10) >>> CRÍTICO: Sincroniza presença com outros jogadores
        // Notifica outros jogadores sobre o novo jogador E
        // Notifica o novo jogador sobre os outros já presentes
        world.syncPresence(player);

        return;
      }

      // === CHAT ===
      // Processa mensagem de chat do jogador
      case 'chat': {
        const session = world.getSession(ws);
        if (!session) return;  // Sem sessão = não autenticado, ignora
        
        // Delega para ChatService que decide distribuição (local/global)
        world.chatService.handleChat(session.player, packet.data);
        return;
      }

      // === MUDANÇA DE DIREÇÃO (sem movimento) ===
      // Jogador vira para uma direção mas não anda
      case 'm': {
        const session = world.getSession(ws);
        if (!session) return;  // Sem sessão = não autenticado, ignora
        
        // Valida coordenadas enviadas pelo cliente
        const coordValidation = world.securityService.validateClientCoordinates(
          session.player,
          packet.x,
          packet.y
        );

        if (!coordValidation.valid) {
          // Coordenadas inválidas - resincroniza cliente com servidor IMEDIATAMENTE
          world.logger.debug(
            { sessionId: session.player.sessionId, reason: coordValidation.reason },
            'Cliente com coordenadas dessincronizadas (comando m) - corrigindo'
          );
          
          // Força envio de snapshot correto para resincronizar
          const correctionSnapshot = world.playerService.makePlayerSnapshotPacket(session.player);
          world.sendTo(session.player, correctionSnapshot);
          
          // Também envia para outros jogadores para garantir consistência
          world.sendToOthersInMap(session.player, correctionSnapshot);
          return;
        }

        // Atualiza direção do jogador e notifica outros
        world.playerService.setHeading(session.player, packet.d);
        return;
      }

      // === MOVIMENTO ===
      // Inicia ou para movimento do jogador
      case 'h': {
        const session = world.getSession(ws);
        if (!session) return;  // Sem sessão = não autenticado, ignora
        
        // Valida coordenadas enviadas pelo cliente
        const coordValidation = world.securityService.validateClientCoordinates(
          session.player,
          packet.x,
          packet.y
        );

        if (!coordValidation.valid) {
          // Coordenadas inválidas - resincroniza cliente com servidor IMEDIATAMENTE
          world.logger.debug(
            { sessionId: session.player.sessionId, reason: coordValidation.reason },
            'Cliente com coordenadas dessincronizadas (comando h) - corrigindo'
          );
          
          // Força envio de snapshot correto para resincronizar
          const correctionSnapshot = world.playerService.makePlayerSnapshotPacket(session.player);
          world.sendTo(session.player, correctionSnapshot);
          
          // Também envia para outros jogadores para garantir consistência
          world.sendToOthersInMap(session.player, correctionSnapshot);
          return;
        }

        // Se tem direção (0-3), inicia movimento naquela direção
        if (Number.isInteger(packet.d)) {
          world.playerService.startMoving(session.player, packet.d);
        } else {
          // Se não tem direção, para o movimento
          world.playerService.stopMoving(session.player);
        }
        return;
      }

      // === PING/KEEPALIVE ===
      // Cliente envia 'P' periodicamente, servidor responde 'P'
      case 'P': {
        world.sendRaw(ws, { type: 'P' });
        return;
      }

      // === PICKUP ===
      // Jogador tenta coletar um objeto do mundo

      // === TIPO DESCONHECIDO ===
      // Não deve acontecer pois schema já validou, mas por segurança ignora
      default:
        return;
    }
  };
}