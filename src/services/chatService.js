/**
 * Serviço de Chat - Gerenciamento de Mensagens
 * 
 * Este módulo processa mensagens de chat dos jogadores e as distribui
 * para os destinatários apropriados.
 * 
 * Canais suportados:
 * - Chat local (canal 0): mensagem vai para jogadores no mesmo chunk/viewport - Navy blue color
 * - Chat global (/b): mensagem vai para todos os jogadores conectados - #FF44FF (VIP users use name color)
 * - Chat tribe (/tc): mensagem vai para membros da tribo/guilda - Orange color
 * - Chat private (/t player message): mensagem privada para um jogador específico - Light green color
 * - Comandos especiais: /ping, /help, etc
 * 
 * Segurança:
 * - Escape de HTML para prevenir XSS
 * - Limite de 2048 caracteres por mensagem (validado no schema)
 */

export class ChatService {
  constructor(env, logger, world) {
    this.env = env;       // Configurações do ambiente
    this.logger = logger; // Logger para registrar eventos
    this.world = world;   // World para acessar jogadores e enviar mensagens
  }

  /**
   * Verifica se o jogador tem premium ativo
   * 
   * @param {Object} player - Jogador
   * @returns {boolean} True se tem premium ativo
   */
  hasActivePremium(player) {
    return player.premium && player.premium > 0;
  }

  /**
   * Obtém a cor do nome do jogador
   * 
   * @param {Object} player - Jogador
   * @returns {string} Cor em formato hexadecimal (ex: "#FFFFFF")
   */
  getPlayerNameColor(player) {
    if (player.appearance && player.appearance.nameColor) {
      // Converte de decimal para hexadecimal
      const color = player.appearance.nameColor;
      return '#' + color.toString(16).padStart(6, '0').toUpperCase();
    }
    return '#FFFFFF'; // Cor padrão (branco)
  }

  /**
   * Formata mensagem com cor HTML
   * 
   * @param {string} message - Mensagem a ser formatada
   * @param {string} color - Cor em formato hexadecimal (ex: "#FF44FF")
   * @returns {string} Mensagem formatada com HTML
   */
  formatMessageWithColor(message, color) {
    return `<span style='color:${color}'>${message}</span>`;
  }

  /**
   * Processa uma mensagem de chat do jogador
   * 
   * @param {Object} player - Jogador que enviou a mensagem
   * @param {string} data - Texto da mensagem
   * 
   * Comportamento:
   * - Comandos que começam com '/' são tratados especialmente
   * - /ping: responde com PONG!
   * - /quit: salva o jogador e desconecta
   * - /b mensagem: envia para todos (global broadcast) - cor #FF44FF ou cor do nome VIP
   * - /tc mensagem: envia para tribo/guilda - cor laranja (apenas membros veem)
   * - /t jogador mensagem: envia mensagem privada - cor verde claro
   * - Outras mensagens: envia para jogadores no mesmo chunk/viewport (local) - cor azul marinho
   * 
   * Formato da mensagem enviada:
   * { type: 'message', text: 'Nome: mensagem' }
   */
  handleChat(player, data) {
    // Converte para string e limita tamanho (segurança extra)
    const text = (data || '').toString().slice(0, 2048);

    // === COMANDOS ESPECIAIS ===
    
    // Comando /ping: responde apenas ao jogador que enviou
    if (text.startsWith('/ping')) {
      this.world.sendTo(player, { type: 'message', text: 'PONG!' });
      return;
    }

    // Comando /quit: salva o jogador e desconecta
    if (text.startsWith('/quit')) {
      this.world.sendTo(player, { type: 'message', text: "<strong><span style='color:#ffff00'>See you later!</span></strong>" });
      this.world.sendTo(player, { type: 'quit', text: 'bubye' });
      return;
    }
    
    // Comando /give - Dá item ao jogador (para testes/admin)
    // Formato: /give <item_template> [quantidade]
    if (text.startsWith('/give ')) {
      const args = text.substring(6).trim().split(' ');
      if (args.length < 1) {
        this.world.sendTo(player, {
          type: 'message',
          text: this.formatMessageWithColor(
            'Usage: /give <item_template> [quantity]',
            '#FF0000'
          )
        });
        return;
      }
      
      const templateId = args[0];
      const quantity = args[1] ? parseInt(args[1], 10) : 1;
      
      if (isNaN(quantity) || quantity < 1) {
        this.world.sendTo(player, {
          type: 'message',
          text: this.formatMessageWithColor(
            'Invalid quantity',
            '#FF0000'
          )
        });
        return;
      }
      
      const result = this.world.itemService.addItem(player, templateId, quantity);
      
      this.world.sendTo(player, {
        type: 'message',
        text: this.formatMessageWithColor(
          result.success ? `Added ${quantity}x ${templateId}` : result.message,
          result.success ? '#00FF00' : '#FF0000'
        )
      });
      return;
    }
    
    // Comando /items - Lista templates de items disponíveis
    if (text.startsWith('/items')) {
      const { getAllItemTemplates } = await import('../models/Item.js');
      const templates = getAllItemTemplates();
      
      this.world.sendTo(player, {
        type: 'message',
        text: this.formatMessageWithColor(
          `Available items: ${templates.join(', ')}`,
          '#FFFF00'
        )
      });
      return;
    }

    // === CHAT MESSAGES ===
    
    // Comando /b - Chat Global (Broadcast)
    // Cor: #FF44FF (padrão) ou cor do nome se VIP
    if (text.startsWith('/b ')) {
      const message = text.substring(3).trim(); // Remove "/b "
      if (!message) return; // Mensagem vazia, ignora
      
      // Determina cor da mensagem
      let color = '#FF44FF'; // Cor padrão para não-VIP
      if (this.hasActivePremium(player)) {
        color = this.getPlayerNameColor(player); // VIP usa cor do nome
      }
      
      const formattedMessage = this.formatMessageWithColor(
        this.escapeHTML(`${player.name}: ${message}`),
        color
      );
      
      const msg = {
        type: 'message',
        text: formattedMessage
      };
      
      // Envia para TODOS os jogadores conectados (cross-map)
      this.world.broadcastAll(msg);
      return;
    }
    
    // Comando /tc - Chat Tribe/Guild
    // Cor: Laranja (#FFA500)
    // TODO: Implementar sistema de tribos/guildas completo
    if (text.startsWith('/tc ')) {
      const message = text.substring(4).trim(); // Remove "/tc "
      if (!message) return; // Mensagem vazia, ignora
      
      // Por enquanto, envia mensagem informando que o sistema ainda não está implementado
      this.world.sendTo(player, {
        type: 'message',
        text: this.formatMessageWithColor(
          'Tribe/Guild system not yet implemented',
          '#FFA500'
        )
      });
      
      // TODO: Quando implementar sistema de tribos:
      // 1. Verificar se player pertence a uma tribo/guilda
      // 2. Obter lista de membros da tribo/guilda
      // 3. Enviar mensagem laranja para todos os membros online (cross-map)
      // const formattedMessage = this.formatMessageWithColor(
      //   this.escapeHTML(`[Tribe] ${player.name}: ${message}`),
      //   '#FFA500'
      // );
      // this.world.broadcastToTribeMembers(player.tribeId, { type: 'message', text: formattedMessage });
      return;
    }
    
    // Comando /t - Chat Privado (Tell/Whisper)
    // Cor: Verde claro (#90EE90)
    if (text.startsWith('/t ')) {
      const args = text.substring(3).trim().split(' '); // Remove "/t "
      if (args.length < 2) {
        // Formato inválido
        this.world.sendTo(player, {
          type: 'message',
          text: this.formatMessageWithColor(
            'Usage: /t <player_name> <message>',
            '#FF0000'
          )
        });
        return;
      }
      
      const targetName = args[0];
      const message = args.slice(1).join(' ');
      
      if (!message) return; // Mensagem vazia, ignora
      
      // Busca o jogador alvo pelo nome
      let targetPlayer = null;
      for (const p of this.world.players.values()) {
        if (p.name.toLowerCase() === targetName.toLowerCase()) {
          targetPlayer = p;
          break;
        }
      }
      
      if (!targetPlayer) {
        // Jogador não encontrado
        this.world.sendTo(player, {
          type: 'message',
          text: this.formatMessageWithColor(
            `Player '${this.escapeHTML(targetName)}' not found`,
            '#FF0000'
          )
        });
        return;
      }
      
      // Formata mensagem privada com cor verde claro
      const formattedMessage = this.formatMessageWithColor(
        this.escapeHTML(`[From ${player.name}]: ${message}`),
        '#90EE90'
      );
      
      const formattedMessageSender = this.formatMessageWithColor(
        this.escapeHTML(`[To ${targetPlayer.name}]: ${message}`),
        '#90EE90'
      );
      
      // Envia para o destinatário
      this.world.sendTo(targetPlayer, {
        type: 'message',
        text: formattedMessage
      });
      
      // Confirma para o remetente
      this.world.sendTo(player, {
        type: 'message',
        text: formattedMessageSender
      });
      
      return;
    }
    
    // Chat Local (Channel 0) - Cor: Azul marinho (#000080)
    // Envia apenas para jogadores no mesmo chunk/viewport
    const formattedMessage = this.formatMessageWithColor(
      this.escapeHTML(`${player.name}: ${text}`),
      '#000080' // Navy blue
    );
    
    const msg = {
      type: 'message',
      text: formattedMessage
    };
    
    // Envia apenas para jogadores próximos (mesmo chunk)
    this.world.broadcastInChunk(player, msg);
  }

  /**
   * Processa o comando /quit
   * 
   * @param {Object} player - Jogador que enviou o comando
   * 

  /**
   * Escapa caracteres HTML para prevenir XSS
   * 
   * @param {string} s - String a ser escapada
   * @returns {string} String com caracteres HTML escapados
   * 
   * Conversões:
   * - & -> &amp;
   * - < -> &lt;
   * - > -> &gt;
   * - " -> &quot;
   * 
   * Isso previne que jogadores injetem HTML/JavaScript malicioso
   * nas mensagens de chat que seria executado no cliente de outros jogadores.
   */
  escapeHTML(s) {
    return s
      .replaceAll('&', '&amp;')   // Deve ser primeiro para não escapar os outros
      .replaceAll('<', '&lt;')    // Previne tags HTML
      .replaceAll('>', '&gt;')    // Previne tags HTML
      .replaceAll('"', '&quot;'); // Previne atributos HTML
  }
}