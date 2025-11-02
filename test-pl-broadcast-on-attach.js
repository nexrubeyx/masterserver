/**
 * Teste de Broadcast de 'pl' no Attach
 * 
 * Este script testa que quando um jogador faz login (attachSession),
 * todos os jogadores no mapa recebem imediatamente um pacote 'pl'
 * com a lista atualizada de jogadores, garantindo que não haja ghosts.
 * 
 * Para executar: node test-pl-broadcast-on-attach.js
 */

import { World } from './src/state/world.js';
import { loadEnv } from './src/config/env.js';
import { createLogger } from './src/logger.js';

async function testPlBroadcastOnAttach() {
  console.log('=== Teste de Broadcast de pl no Attach ===\n');

  // Carrega configurações
  const env = loadEnv();
  const logger = createLogger();

  try {
    // Cria instância do World
    console.log('Criando instância do World...');
    const world = new World(env, logger);
    await world.init();
    console.log('✓ World inicializado\n');

    // === PRIMEIRO JOGADOR ===
    console.log('=== Anexando Primeiro Jogador ===');
    const ws1 = createMockWebSocket('192.168.1.1');
    
    const user1 = {
      _id: 'user1-id',
      username: 'player1'
    };
    
    const player1 = {
      dbId: 'player1-db',
      mapId: 'test2',
      x: 50,
      y: 50,
      dir: 0,
      name: 'Player1',
      level: 5,
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
    
    world.attachSession(ws1, { user: user1, player: player1 });
    console.log('✓ Primeiro jogador anexado\n');

    // Limpa mensagens para focar no próximo attach
    ws1.sentMessages = [];

    // === SEGUNDO JOGADOR ===
    console.log('=== Anexando Segundo Jogador ===');
    const ws2 = createMockWebSocket('192.168.1.2');
    
    const user2 = {
      _id: 'user2-id',
      username: 'player2'
    };
    
    const player2 = {
      dbId: 'player2-db',
      mapId: 'test2',
      x: 52,
      y: 50,
      dir: 0,
      name: 'Player2',
      level: 3,
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
    
    world.attachSession(ws2, { user: user2, player: player2 });
    console.log('✓ Segundo jogador anexado\n');

    // === VERIFICAÇÕES ===
    
    // 1. Verifica que o primeiro jogador recebeu 'pl' após o attach do segundo
    console.log('Verificando que primeiro jogador recebeu pacote pl...');
    const plMessages1 = ws1.sentMessages.filter(msg => msg.type === 'pl');
    
    if (plMessages1.length === 0) {
      console.error('✗ FALHA: Primeiro jogador não recebeu pacote pl após attach do segundo');
      console.error('Mensagens recebidas:', ws1.sentMessages);
      process.exit(1);
    }
    console.log('✓ Primeiro jogador recebeu pacote pl\n');

    // 2. Verifica que o segundo jogador recebeu 'pl' após seu próprio attach
    console.log('Verificando que segundo jogador recebeu pacote pl...');
    const plMessages2 = ws2.sentMessages.filter(msg => msg.type === 'pl');
    
    if (plMessages2.length === 0) {
      console.error('✗ FALHA: Segundo jogador não recebeu pacote pl após seu attach');
      console.error('Mensagens recebidas:', ws2.sentMessages);
      process.exit(1);
    }
    console.log('✓ Segundo jogador recebeu pacote pl\n');

    // 3. Verifica que o 'pl' contém os dois jogadores
    console.log('Verificando que pl contém os dois jogadores...');
    const lastPl = plMessages2[plMessages2.length - 1];
    
    if (!lastPl.data || !Array.isArray(lastPl.data)) {
      console.error('✗ FALHA: Pacote pl não contém array de dados');
      console.error('Pacote pl:', lastPl);
      process.exit(1);
    }
    
    if (lastPl.data.length !== 2) {
      console.error(`✗ FALHA: Esperava 2 jogadores no pl, encontrou ${lastPl.data.length}`);
      console.error('Pacote pl:', lastPl);
      process.exit(1);
    }
    console.log('✓ Pacote pl contém os dois jogadores\n');

    // === TESTE DE DUPLICATE LOGIN ===
    console.log('=== Testando Duplicate Login com pl Broadcast ===');
    
    // Limpa mensagens
    ws1.sentMessages = [];
    ws2.sentMessages = [];
    
    // Terceiro WebSocket para o mesmo usuário do primeiro
    const ws3 = createMockWebSocket('192.168.1.3');
    
    const player3 = {
      dbId: 'player1-db',  // Mesmo dbId do primeiro
      mapId: 'test2',
      x: 50,
      y: 50,
      dir: 0,
      name: 'Player1',
      level: 5,
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
    
    world.attachSession(ws3, { user: user1, player: player3 });
    console.log('✓ Terceira conexão anexada (duplicate login)\n');

    // Verifica que a nova sessão enviou 'pl' para todos
    console.log('Verificando que pl foi enviado após duplicate login...');
    
    // ws2 deve ter recebido pl (jogador 2 ainda está conectado)
    const plAfterDuplicate = ws2.sentMessages.filter(msg => msg.type === 'pl');
    
    if (plAfterDuplicate.length === 0) {
      console.error('✗ FALHA: Jogador 2 não recebeu pl após duplicate login');
      console.error('Mensagens recebidas:', ws2.sentMessages);
      process.exit(1);
    }
    console.log('✓ Jogador 2 recebeu pl após duplicate login\n');

    // ws3 deve ter recebido pl também
    const plForNewSession = ws3.sentMessages.filter(msg => msg.type === 'pl');
    
    if (plForNewSession.length === 0) {
      console.error('✗ FALHA: Nova sessão não recebeu pl após attach');
      console.error('Mensagens recebidas:', ws3.sentMessages);
      process.exit(1);
    }
    console.log('✓ Nova sessão recebeu pl após attach\n');

    // Verifica que apenas 2 jogadores estão no pl (player2 e player3)
    console.log('Verificando que pl contém apenas 2 jogadores após duplicate login...');
    const lastPlAfterDup = plAfterDuplicate[plAfterDuplicate.length - 1];
    
    if (lastPlAfterDup.data.length !== 2) {
      console.error(`✗ FALHA: Esperava 2 jogadores no pl, encontrou ${lastPlAfterDup.data.length}`);
      console.error('Pacote pl:', lastPlAfterDup);
      process.exit(1);
    }
    console.log('✓ Pacote pl contém apenas 2 jogadores (sem duplicatas)\n');

    // Limpa
    console.log('Limpando...');
    await world.shutdown();
    console.log('✓ World finalizado\n');

    console.log('=== TODOS OS TESTES PASSARAM ===');
    console.log('\n✓ Pacote pl é enviado imediatamente quando um jogador anexa sessão');
    console.log('✓ Todos os jogadores no mapa recebem o pl atualizado');
    console.log('✓ Pacote pl contém lista correta de jogadores ativos');
    console.log('✓ Em duplicate login, pl é enviado para garantir reconciliação');
    console.log('✓ Não há jogadores duplicados no pl após duplicate login');
    
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

testPlBroadcastOnAttach();
