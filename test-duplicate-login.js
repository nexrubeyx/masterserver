/**
 * Teste de Login Duplicado - Kick da Sessão Antiga
 * 
 * Este script testa a funcionalidade que permite login duplicado,
 * desconectando automaticamente a sessão antiga quando um usuário
 * faz login novamente de outra localização.
 * 
 * Para executar: node test-duplicate-login.js
 */

import { World } from './src/state/world.js';
import { loadEnv } from './src/config/env.js';
import { createLogger } from './src/logger.js';

async function testDuplicateLogin() {
  console.log('=== Teste de Login Duplicado ===\n');

  // Carrega configurações
  const env = loadEnv();
  const logger = createLogger();

  try {
    // Cria instância do World
    console.log('Criando instância do World...');
    const world = new World(env, logger);
    await world.init();
    console.log('✓ World inicializado\n');

    // Cria usuário de teste
    const user = {
      _id: 'test-user-123',
      username: 'testplayer'
    };

    // === PRIMEIRA CONEXÃO ===
    console.log('=== Primeira Conexão ===');
    console.log('Criando primeira conexão WebSocket...');
    const ws1 = createMockWebSocket('192.168.1.1');
    
    const player1 = {
      dbId: 'test-player-123',
      mapId: 'test2',
      x: 50,
      y: 50,
      dir: 0,
      name: 'TestPlayer',
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
    
    world.attachSession(ws1, { user, player: player1 });
    console.log('✓ Primeira sessão anexada\n');

    // Verifica que a primeira sessão está ativa
    console.log('Verificando que a primeira sessão está ativa...');
    const session1 = world.getSession(ws1);
    if (!session1) {
      console.error('✗ FALHA: Primeira sessão não foi anexada');
      process.exit(1);
    }
    console.log(`✓ Primeira sessão ativa: sessionId=${session1.player.sessionId}\n`);

    // Verifica que há 1 jogador no mapa
    let playersInMap = world.getPlayersInMap('test2');
    if (playersInMap.length !== 1) {
      console.error(`✗ FALHA: Esperava 1 jogador no mapa, encontrou ${playersInMap.length}`);
      process.exit(1);
    }
    console.log('✓ 1 jogador no mapa (primeira sessão)\n');

    // === SEGUNDA CONEXÃO (DUPLICADA) ===
    console.log('=== Segunda Conexão (mesmo usuário) ===');
    console.log('Criando segunda conexão WebSocket para o mesmo usuário...');
    const ws2 = createMockWebSocket('192.168.1.2');
    
    // Usa o mesmo user mas cria nova instância de player
    // (simula o comportamento do ensurePlayer que retorna o player do banco)
    const player2 = {
      dbId: 'test-player-123',  // Mesmo dbId (mesmo personagem no banco)
      mapId: 'test2',
      x: 50,
      y: 50,
      dir: 0,
      name: 'TestPlayer',
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
    
    // Limpa mensagens da primeira sessão para verificar se recebeu a mensagem de kick
    ws1.sentMessages = [];
    
    world.attachSession(ws2, { user, player: player2 });
    console.log('✓ Segunda sessão anexada\n');

    // === VERIFICAÇÕES ===
    
    // 1. Verifica que a primeira sessão recebeu mensagem de kick
    console.log('Verificando que primeira sessão recebeu mensagem de kick...');
    const kickMessages = ws1.sentMessages.filter(msg => 
      msg.type === 'logmsg' && msg.text.includes('logged in from another location')
    );
    
    if (kickMessages.length !== 1) {
      console.error('✗ FALHA: Primeira sessão não recebeu mensagem de kick');
      console.error('Mensagens recebidas:', ws1.sentMessages);
      process.exit(1);
    }
    console.log('✓ Primeira sessão recebeu mensagem: "You have logged in from another location."\n');

    // 2. Verifica que o WebSocket da primeira sessão foi fechado
    console.log('Verificando que primeira conexão foi fechada...');
    if (ws1.readyState !== 3) { // 3 = CLOSED
      console.error('✗ FALHA: Primeira conexão não foi fechada (readyState !== 3)');
      process.exit(1);
    }
    console.log('✓ Primeira conexão foi fechada\n');

    // 3. Verifica que a primeira sessão foi removida do mundo
    console.log('Verificando que primeira sessão foi removida do mundo...');
    const session1After = world.getSession(ws1);
    if (session1After) {
      console.error('✗ FALHA: Primeira sessão ainda está no mapa de sessões');
      process.exit(1);
    }
    console.log('✓ Primeira sessão foi removida do mapa de sessões\n');

    // 4. Verifica que a segunda sessão está ativa
    console.log('Verificando que segunda sessão está ativa...');
    const session2 = world.getSession(ws2);
    if (!session2) {
      console.error('✗ FALHA: Segunda sessão não foi anexada');
      process.exit(1);
    }
    console.log(`✓ Segunda sessão ativa: sessionId=${session2.player.sessionId}\n`);

    // 5. Verifica que ainda há apenas 1 jogador no mapa (não duplicado)
    console.log('Verificando que há apenas 1 jogador no mapa...');
    playersInMap = world.getPlayersInMap('test2');
    if (playersInMap.length !== 1) {
      console.error(`✗ FALHA: Esperava 1 jogador no mapa, encontrou ${playersInMap.length}`);
      console.error('Jogadores no mapa:', playersInMap.map(p => ({ sessionId: p.sessionId, name: p.name })));
      process.exit(1);
    }
    console.log('✓ Apenas 1 jogador no mapa (segunda sessão)\n');

    // 6. Verifica que o jogador no mapa é da segunda sessão
    console.log('Verificando que o jogador no mapa é da segunda sessão...');
    const playerInMap = playersInMap[0];
    if (playerInMap.sessionId !== session2.player.sessionId) {
      console.error('✗ FALHA: O jogador no mapa não é da segunda sessão');
      console.error(`Esperado sessionId: ${session2.player.sessionId}, encontrado: ${playerInMap.sessionId}`);
      process.exit(1);
    }
    console.log('✓ O jogador no mapa é da segunda sessão\n');

    // 7. Verifica que a segunda conexão está aberta
    console.log('Verificando que segunda conexão está aberta...');
    if (ws2.readyState !== 1) { // 1 = OPEN
      console.error('✗ FALHA: Segunda conexão não está aberta (readyState !== 1)');
      process.exit(1);
    }
    console.log('✓ Segunda conexão está aberta\n');

    // Limpa
    console.log('Limpando...');
    await world.shutdown();
    console.log('✓ World finalizado\n');

    console.log('=== TODOS OS TESTES PASSARAM ===');
    console.log('\n✓ Quando um usuário faz login duplicado, a sessão antiga é desconectada');
    console.log('✓ A sessão antiga recebe mensagem informativa antes de ser desconectada');
    console.log('✓ A sessão antiga é completamente removida do mundo (sem ghost players)');
    console.log('✓ A nova sessão é anexada com sucesso');
    console.log('✓ Apenas uma sessão permanece ativa (sem duplicação)');
    
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

testDuplicateLogin();
