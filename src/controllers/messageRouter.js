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
import { validateAppearanceChanges, hasActivePremium } from '../constants/appearance.js';

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
          id: Number(player.sessionId),  // ID da sessão (único)
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
        
        // 8.5) Envia pacote 'game' com informações de premium e locks de costume
        // Este pacote é esperado pelo cliente para habilitar funcionalidades premium
        world.sendTo(player, {
          type: 'game',
          pr: player.premium || 0,  // Dias de premium
          lb: '',  // Lock body (string vazia = nada bloqueado)
          lh: '',  // Lock hair (string vazia = nada bloqueado)
          lc: ''   // Lock clothes (string vazia = nada bloqueado)
        });
        
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

      // === SPRITE APPEARANCE CHANGE ===
      // Troca de sprite/aparência (sem validação de cores)
      // Cliente envia {"type":"c","r":"ap","c":1,"b":1,"h":1,"cc":14540253,"hc":6504471,"ec":255,"nc":15724527}
      // 
      // DESIGN DECISION: Este sistema NÃO valida cores intencionalmente.
      // O cliente pode enviar qualquer cor RGB. Isso é diferente do sistema 'costume'
      // que valida cores contra FREE_COLORS e PREMIUM_COLORS.
      // 
      // Motivo: Flexibilidade para o cliente - o servidor não restringe cores em sprites.
      // Apenas body, hair e clothes são validados contra listas premium/free.
      case 'c': {
        const session = world.getSession(ws);
        if (!session) return;  // Sem sessão = não autenticado, ignora
        
        const player = session.player;
        
        // Verifica se o jogador tem premium usando função utilitária
        const isPremium = hasActivePremium(player);
        
        // Prepara objeto com as mudanças solicitadas (apenas body, hair, clothes)
        // NÃO valida cores - aceita qualquer valor enviado pelo cliente
        const changes = {};
        if (typeof packet.b === 'number') changes.body = packet.b;
        if (typeof packet.h === 'number') changes.hair = packet.h;
        if (typeof packet.c === 'number') changes.clothes = packet.c;
        
        // Valida apenas body, hair e clothes (não valida cores)
        const validation = validateAppearanceChanges(changes, isPremium);
        
        if (!validation.valid) {
          // Mudança não permitida - envia erro
          world.sendTo(player, {
            type: 'c',
            r: 'er',
            msg: validation.reason || 'Invalid appearance change'
          });
          return;
        }
        
        // Atualiza aparência do jogador
        let changed = false;
        if (changes.body !== undefined) {
          player.appearance.body = changes.body;
          changed = true;
        }
        if (changes.hair !== undefined) {
          player.appearance.hair = changes.hair;
          changed = true;
        }
        if (changes.clothes !== undefined) {
          player.appearance.clothes = changes.clothes;
          changed = true;
        }
        
        // Atualiza cores diretamente sem validação
        if (typeof packet.cc === 'number') {
          player.appearance.clothesColor = packet.cc;
          changed = true;
        }
        if (typeof packet.hc === 'number') {
          player.appearance.hairColor = packet.hc;
          changed = true;
        }
        if (typeof packet.ec === 'number') {
          player.appearance.eyeColor = packet.ec;
          changed = true;
        }
        if (typeof packet.nc === 'number') {
          player.appearance.nameColor = packet.nc;
          changed = true;
        }
        
        if (changed) {
          // Salva a aparência no banco de dados
          world.playerService.persistFullState(player).catch(err => {
            world.logger.warn({ err: err.message }, 'Failed to persist appearance change');
          });
          
          // Envia resposta de sucesso com aparência completa (formato esperado pelo cliente)
          world.sendTo(player, {
            type: 'c',
            r: 'ap',
            c: player.appearance.clothes,
            b: player.appearance.body,
            h: player.appearance.hair,
            cc: player.appearance.clothesColor,
            hc: player.appearance.hairColor,
            ec: player.appearance.eyeColor,
            nc: player.appearance.nameColor
          });
          
          // Atualiza template para TODOS os jogadores no mapa (incluindo o próprio jogador)
          const templatePacket = world.playerService.makePlayerTemplatePacket(player);
          world.sendToAllInMap(player, templatePacket);
          
          // Envia snapshot para o próprio jogador primeiro, para que o cliente recrie o personagem
          // com a nova aparência (similar ao fluxo de login)
          const snapshotPacket = world.playerService.makePlayerSnapshotPacket(player);
          world.sendTo(player, snapshotPacket);
          
          // Envia snapshot para outros jogadores para que vejam a atualização
          world.sendToOthersInMap(player, snapshotPacket);
        }
        
        return;
      }

      // === PICKUP ===
      // Jogador tenta coletar um objeto do mundo

      // === COSTUME CHANGE ===
      // Jogador tenta trocar de roupa/aparência
      case 'costume': {
        const session = world.getSession(ws);
        if (!session) return;  // Sem sessão = não autenticado, ignora
        
        const player = session.player;
        
        // Verifica se o jogador tem premium usando função utilitária
        const isPremium = hasActivePremium(player);
        
        // Prepara objeto com as mudanças solicitadas
        const changes = {};
        if (typeof packet.sprite === 'number') changes.sprite = packet.sprite;
        if (typeof packet.body === 'number') changes.body = packet.body;
        if (typeof packet.hair === 'number') changes.hair = packet.hair;
        if (typeof packet.clothes === 'number') changes.clothes = packet.clothes;
        if (typeof packet.hair_color === 'number') changes.hairColor = packet.hair_color;
        if (typeof packet.clothes_color === 'number') changes.clothesColor = packet.clothes_color;
        if (typeof packet.eye_color === 'number') changes.eyeColor = packet.eye_color;
        
        // Valida se as mudanças são permitidas
        const validation = validateAppearanceChanges(changes, isPremium);
        
        if (!validation.valid) {
          // Mudança não permitida - envia erro
          world.sendTo(player, {
            type: 'c',
            r: 'er',
            msg: validation.reason || 'Invalid appearance change'
          });
          return;
        }
        
        // Atualiza aparência do jogador com valores validados
        let changed = false;
        if (changes.sprite !== undefined) {
          player.appearance.sprite = changes.sprite;
          changed = true;
        }
        if (changes.body !== undefined) {
          player.appearance.body = changes.body;
          changed = true;
        }
        if (changes.hair !== undefined) {
          player.appearance.hair = changes.hair;
          changed = true;
        }
        if (changes.clothes !== undefined) {
          player.appearance.clothes = changes.clothes;
          changed = true;
        }
        if (changes.hairColor !== undefined) {
          player.appearance.hairColor = changes.hairColor;
          changed = true;
        }
        if (changes.clothesColor !== undefined) {
          player.appearance.clothesColor = changes.clothesColor;
          changed = true;
        }
        if (changes.eyeColor !== undefined) {
          player.appearance.eyeColor = changes.eyeColor;
          changed = true;
        }
        
        if (changed) {
          // Salva a aparência no banco de dados
          world.playerService.persistFullState(player).catch(err => {
            world.logger.warn({ err: err.message }, 'Failed to persist appearance change');
          });
          
          // Envia resposta de sucesso com aparência completa (formato esperado pelo cliente)
          world.sendTo(player, {
            type: 'c',
            r: 'ap',
            c: player.appearance.clothes,
            b: player.appearance.body,
            h: player.appearance.hair,
            cc: player.appearance.clothesColor,
            hc: player.appearance.hairColor,
            ec: player.appearance.eyeColor,
            nc: player.appearance.nameColor
          });
          
          // Atualiza template para TODOS os jogadores no mapa (incluindo o próprio jogador)
          const templatePacket = world.playerService.makePlayerTemplatePacket(player);
          world.sendToAllInMap(player, templatePacket);
          
          // Envia snapshot para outros jogadores para que o cliente recrie o mob com o novo template
          // Isso evita que o personagem desapareça após receber o plr_tpl update
          const snapshotPacket = world.playerService.makePlayerSnapshotPacket(player);
          world.sendToOthersInMap(player, snapshotPacket);
        }
        
        return;
      }

      // === TIPO DESCONHECIDO ===
      // Não deve acontecer pois schema já validou, mas por segurança ignora
      default:
        return;
    }
  };
}