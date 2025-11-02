/**
 * Serviço de Chat - Gerenciamento de Mensagens
 * 
 * Este módulo processa mensagens de chat dos jogadores e as distribui
 * para os destinatários apropriados.
 * 
 * Canais suportados:
 * - Chat local: mensagem vai para todos no mesmo mapa
 * - Chat global (/b): mensagem vai para todos os jogadores conectados
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
   * Processa uma mensagem de chat do jogador
   * 
   * @param {Object} player - Jogador que enviou a mensagem
   * @param {string} data - Texto da mensagem
   * 
   * Comportamento:
   * - Comandos que começam com '/' são tratados especialmente
   * - /ping: responde com PONG!
   * - /quit: salva o jogador e desconecta
   * - /b mensagem: envia para todos (global broadcast)
   * - Outras mensagens: envia para todos no mesmo mapa (local)
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


     

    // === MENSAGENS DE CHAT ===
    
    // Monta pacote de mensagem com escape de HTML
    // Formato: "NomeDoJogador: mensagem"
    const msg = {
      type: 'message',
      text: this.escapeHTML(`${player.name}: ${text}`)
    };

    // Determina destinatários baseado no prefixo
    if (text.startsWith('/b ')) {
      // Canal Global (/b) - envia para TODOS os jogadores conectados
      this.world.broadcastAll(msg);
    } else {
      // Canal Local - envia apenas para jogadores no mesmo mapa
      this.world.broadcastInMap(player.mapId, msg);
    }
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