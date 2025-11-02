/**
 * Teste de Correção de Ghost Players
 * 
 * Este script testa a funcionalidade de remoção correta de jogadores quando desconectam,
 * garantindo que outros jogadores recebam o evento de remoção apropriado.
 * 
 * Para executar: node test-ghost-player-fix.js
 */

import { World } from './src/state/world.js';
import { loadEnv } from './src/config/env.js';
import { createLogger } from './src/logger.js';

async function testGhostPlayerFix() {
  console.log('=== Teste de Correção de Ghost Players ===\n');

  // Carrega configurações
  const env = loadEnv();
  const logger = createLogger();

  try {
    // Cria instância do World
    console.log('Criando instância do World...');
    const world = new World(env, logger);
    await world.init();
    console.log('✓ World inicializado\n');

    // Simula dois WebSockets
    console.log('Criando conexões WebSocket simuladas...');
    const ws1 = createMockWebSocket('192.168.1.1');
    const ws2 = createMockWebSocket('192.168.1.2');
    console.log('✓ WebSockets criados\n');

    // Cria dois jogadores de teste
    console.log('Anexando jogador 1...');
    const player1 = {
      dbId: 'test-user-1',
      mapId: 'test2',
      x: 50,
      y: 50,
      dir: 0,
      name: 'Player1',
      level: 1,
      inventory: [],
      appearance: {
        nameColor: 0xFFFFFF,
        sprite: -1,
        body: 0,
        hair: 0,
        hairColor: 0x000000,
        clothes: 0,
        clothesColor: 0xFF0000,
        eyeColor: 0x0000FF
      }
    };
    
    const user1 = {
      _id: 'user1-id',
      username: 'player1'
    };
    
    world.attachSession(ws1, { user: user1, player: player1 });
    console.log('✓ Jogador 1 anexado\n');

    console.log('Anexando jogador 2...');
    const player2 = {
      dbId: 'test-user-2',
      mapId: 'test2',
      x: 52,
      y: 50,
      dir: 0,
      name: 'Player2',
      level: 1,
      inventory: [],
      appearance: {
        nameColor: 0xFFFFFF,
        sprite: -1,
        body: 0,
        hair: 0,
        hairColor: 0x000000,
        clothes: 0,
        clothesColor: 0x00FF00,
        eyeColor: 0x0000FF
      }
    };
    
    const user2 = {
      _id: 'user2-id',
      username: 'player2'
    };
    
    world.attachSession(ws2, { user: user2, player: player2 });
    console.log('✓ Jogador 2 anexado\n');

    // Verifica que ambos os jogadores estão no mundo
    console.log('Verificando que ambos os jogadores estão no mundo...');
    const session1 = world.getSession(ws1);
    const session2 = world.getSession(ws2);
    
    if (!session1 || !session2) {
      console.error('✗ FALHA: Um ou ambos os jogadores não foram anexados corretamente');
      process.exit(1);
    }
    console.log('✓ Ambos os jogadores estão no mundo');
    console.log(`  - Jogador 1: sessionId=${session1.player.sessionId}, nome=${session1.player.name}`);
    console.log(`  - Jogador 2: sessionId=${session2.player.sessionId}, nome=${session2.player.name}\n`);

    // Verifica que estão no mesmo mapa
    console.log('Verificando que estão no mesmo mapa...');
    const playersInMap = world.getPlayersInMap('test2');
    if (playersInMap.length !== 2) {
      console.error(`✗ FALHA: Esperava 2 jogadores no mapa, encontrou ${playersInMap.length}`);
      process.exit(1);
    }
    console.log(`✓ Ambos os jogadores estão no mapa 'test2'\n`);

    // Limpa mensagens anteriores
    ws1.sentMessages = [];
    ws2.sentMessages = [];

    // Simula desconexão do jogador 1
    console.log('Simulando desconexão do jogador 1...');
    world.handleDisconnect(ws1);
    console.log('✓ handleDisconnect chamado\n');

    // Verifica que jogador 1 foi removido do mundo
    console.log('Verificando que jogador 1 foi removido do mundo...');
    const session1After = world.getSession(ws1);
    if (session1After) {
      console.error('✗ FALHA: Jogador 1 ainda está no mapa de sessões');
      process.exit(1);
    }
    console.log('✓ Jogador 1 foi removido do mapa de sessões\n');

    // Verifica que jogador 1 foi removido da lista de jogadores
    console.log('Verificando que jogador 1 foi removido da lista de jogadores...');
    const playersInMapAfter = world.getPlayersInMap('test2');
    if (playersInMapAfter.length !== 1) {
      console.error(`✗ FALHA: Esperava 1 jogador no mapa após desconexão, encontrou ${playersInMapAfter.length}`);
      process.exit(1);
    }
    console.log('✓ Jogador 1 foi removido da lista de jogadores no mapa\n');

    // Verifica que jogador 2 NÃO recebeu evento de remoção
    // O cliente agora depende exclusivamente do sweep da lista "pl" para remover jogadores
    console.log('Verificando que jogador 2 NÃO recebeu evento de remoção...');
    const removeMessages = ws2.sentMessages.filter(msg => msg.type === 'remove');
    
    if (removeMessages.length > 0) {
      console.error('✗ FALHA: Jogador 2 recebeu evento de remoção (não deveria receber)');
      console.error('Mensagens recebidas:', removeMessages);
      process.exit(1);
    }
    
    console.log('✓ Jogador 2 NÃO recebeu evento de remoção (comportamento esperado)');
    console.log('  - O cliente removerá o jogador quando processar o próximo pacote "pl"\n');

    // Verifica que jogador 2 ainda está conectado
    console.log('Verificando que jogador 2 ainda está conectado...');
    const session2After = world.getSession(ws2);
    if (!session2After) {
      console.error('✗ FALHA: Jogador 2 foi removido incorretamente');
      process.exit(1);
    }
    console.log('✓ Jogador 2 ainda está conectado\n');

    // Teste de idempotência - chama handleDisconnect novamente
    console.log('Testando idempotência (chamando handleDisconnect novamente)...');
    ws2.sentMessages = [];
    world.handleDisconnect(ws1);
    
    const newRemoveMessages = ws2.sentMessages.filter(msg => msg.type === 'remove');
    if (newRemoveMessages.length > 0) {
      console.error('✗ FALHA: handleDisconnect não é idempotente - enviou mensagens extras');
      process.exit(1);
    }
    console.log('✓ handleDisconnect é idempotente - não enviou mensagens extras\n');

    // Limpa
    console.log('Limpando...');
    await world.shutdown();
    console.log('✓ World finalizado\n');

    console.log('=== TODOS OS TESTES PASSARAM ===');
    console.log('\n✓ Ghost players são corretamente removidos das estruturas quando jogadores desconectam');
    console.log('✓ Evento de remoção NÃO é mais enviado (comportamento correto)');
    console.log('✓ Cliente removerá jogadores através do sweep do pacote "pl"');
    console.log('✓ handleDisconnect é idempotente');
    
    process.exit(0);

  } catch (error) {
    console.error('✗ ERRO:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Cria um WebSocket simulado para testes
 */
function createMockWebSocket(ip) {
  return {
    _ip: ip,
    _rate: [],
    _alive: true,
    readyState: 1, // OPEN
    bufferedAmount: 0,
    sentMessages: [],
    
    send(data) {
      try {
        const msg = JSON.parse(data);
        this.sentMessages.push(msg);
      } catch (e) {
        console.error('Erro ao parsear mensagem enviada:', e);
      }
    },
    
    close() {
      this.readyState = 3; // CLOSED
    },
    
    terminate() {
      this.readyState = 3; // CLOSED
    },
    
    ping() {},
    
    on() {},
    
    removeAllListeners() {}
  };
}

testGhostPlayerFix();
