export class ChatService {
  constructor(env, logger, world) {
    this.env = env;
    this.logger = logger;
    this.world = world;
  }

  handleChat(player, data) {
    const text = (data || '').toString().slice(0, 2048);

    // Comandos básicos (ex.: /ping, /help). Os canais /b, /tc, /p também chegam aqui.
    if (text.startsWith('/ping')) {
      this.world.sendTo(player, { type: 'message', text: 'PONG!' });
      return;
    }

    // Canal Global (/b) e outros: neste MVP, envia global no mesmo mapa se não for /b
    const msg = {
      type: 'message',
      text: this.escapeHTML(`${player.name}: ${text}`)
    };

    if (text.startsWith('/b ')) {
      // global: para todos conectados
      this.world.broadcastAll(msg);
    } else {
      // local do mapa
      this.world.broadcastInMap(player.mapId, msg);
    }
  }

  escapeHTML(s) {
    return s
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }
}