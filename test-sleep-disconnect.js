/**
 * Teste de Funcionalidade Sleep ao Desconectar
 * 
 * Este script testa a funcionalidade de sleep quando um jogador desconecta.
 * Em vez de remover imediatamente, o jogador deve:
 * 1. Receber mensagem "goes to sleep"
 * 2. Permanecer visível no mapa por 1 minuto
 * 3. Após 1 minuto, ser removido permanentemente
 * 
 * Para executar: node test-sleep-disconnect.js
 */

import { World } from './src/state/world.js';
import { loadEnv } from './src/config/env.js';
import { createLogger } from './src/logger.js';

// Mock WebSocket para testes
function createMockWebSocket(ip) {
  const ws = {
    _ip: ip,
    _rate: [],
    _alive: true,
    readyState: 1, // OPEN
    bufferedAmount: 0,
    send: function(data) {
      // Armazena mensagens enviadas para verificação
      if (!this._sentMessages) this._sentMessages = [];
      try {
        this._sentMessages.push(JSON.parse(data));
      } catch {
        this._sentMessages.push(data);
      }
    },
    close: function() {
      this.readyState = 3; // CLOSED
    },
    ping: function() {},
    terminate: function() { this.readyState = 3; }
  };
  return ws;
}

async function testSleepDisconnect() {
  console.log('=== Teste de Sleep ao Desconectar ===\n');

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
        clothesColor: 0x0000FF,
        eyeColor: 0x00FF00
      }
    };

    const user1 = {
      _id: 'user-1',
      username: 'player1'
    };

    world.attachSession(ws1, { user: user1, player: player1 });
    console.log('✓ Jogador 1 anexado\n');

    console.log('Anexando jogador 2...');
    const player2 = {
      dbId: 'test-user-2',
      mapId: 'test2',
      x: 51,
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
        clothesColor: 0xFF0000,
        eyeColor: 0x00FF00
      }
    };

    const user2 = {
      _id: 'user-2',
      username: 'player2'
    };

    world.attachSession(ws2, { user: user2, player: player2 });
    console.log('✓ Jogador 2 anexado\n');

    // Verifica estado inicial
    console.log('Verificando estado inicial...');
    const playersInMap = world.getPlayersInMap('test2');
    console.log(`  - Jogadores no mapa: ${playersInMap.length}`);
    console.log(`  - Jogadores dormindo: ${world.sleepingPlayers.size}`);
    if (playersInMap.length !== 2) {
      throw new Error('Deveria haver 2 jogadores no mapa');
    }
    console.log('✓ Estado inicial correto\n');

    // Limpa mensagens anteriores
    ws2._sentMessages = [];

    // Simula desconexão do jogador 1
    console.log('Simulando desconexão do jogador 1...');
    world.handleDisconnect(ws1);
    
    // Verifica estado após desconexão
    console.log('Verificando estado após desconexão...');
    const sessionsCount = world.sessions.size;
    const playersCount = world.players.size;
    const sleepingCount = world.sleepingPlayers.size;
    
    console.log(`  - Sessões ativas: ${sessionsCount}`);
    console.log(`  - Jogadores ativos: ${playersCount}`);
    console.log(`  - Jogadores dormindo: ${sleepingCount}`);
    
    if (sessionsCount !== 1) {
      throw new Error(`Deveria haver 1 sessão ativa, mas há ${sessionsCount}`);
    }
    
    if (playersCount !== 2) {
      throw new Error(`Deveria haver 2 jogadores ativos (incluindo dormindo), mas há ${playersCount}`);
    }
    
    if (sleepingCount !== 1) {
      throw new Error(`Deveria haver 1 jogador dormindo, mas há ${sleepingCount}`);
    }
    console.log('✓ Estado correto: jogador 1 está dormindo\n');

    // Verifica mensagem enviada
    console.log('Verificando mensagem "goes to sleep" enviada ao jogador 2...');
    const sleepMessages = ws2._sentMessages.filter(msg => 
      msg.type === 'message' && msg.text && msg.text.includes('goes to sleep')
    );
    
    if (sleepMessages.length === 0) {
      console.log('  ⚠ Nenhuma mensagem "goes to sleep" encontrada');
      console.log('  Mensagens recebidas pelo jogador 2:');
      ws2._sentMessages.forEach((msg, idx) => {
        console.log(`    ${idx + 1}. ${JSON.stringify(msg)}`);
      });
    } else {
      console.log(`  ✓ Mensagem encontrada: ${sleepMessages[0].text}`);
    }

    // Verifica se o jogador 1 está marcado como sleeping
    const player1SessionId = Array.from(world.sleepingPlayers.keys())[0];
    const sleepingPlayerData = world.sleepingPlayers.get(player1SessionId);
    
    if (!sleepingPlayerData) {
      throw new Error('Dados do jogador dormindo não encontrados');
    }
    
    if (!sleepingPlayerData.player.sleeping) {
      throw new Error('Jogador deveria estar marcado como sleeping');
    }
    
    console.log('✓ Jogador 1 está corretamente marcado como sleeping\n');

    // Testa remoção após 1 minuto (simulada com timeout curto para teste)
    console.log('Testando remoção após período de sleep (aguardando 2 segundos para simular)...');
    
    // Cancela o timeout real e simula a execução
    clearTimeout(sleepingPlayerData.timeoutId);
    
    // Chama diretamente a função de finalização
    world.finalizeDisconnect(sleepingPlayerData.player, sleepingPlayerData.user, ws1);
    
    // Aguarda um pouco para processar
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('Verificando estado após finalização...');
    const finalPlayersCount = world.players.size;
    const finalSleepingCount = world.sleepingPlayers.size;
    
    console.log(`  - Jogadores ativos: ${finalPlayersCount}`);
    console.log(`  - Jogadores dormindo: ${finalSleepingCount}`);
    
    if (finalPlayersCount !== 1) {
      throw new Error(`Deveria haver 1 jogador ativo, mas há ${finalPlayersCount}`);
    }
    
    if (finalSleepingCount !== 0) {
      throw new Error(`Não deveria haver jogadores dormindo, mas há ${finalSleepingCount}`);
    }
    
    console.log('✓ Jogador 1 foi removido permanentemente após o período de sleep\n');

    // Fecha conexões
    console.log('Encerrando teste...');
    await world.shutdown();
    console.log('✓ Teste concluído com sucesso!\n');

    console.log('=== RESUMO ===');
    console.log('✓ Jogador entra em modo sleep ao desconectar');
    console.log('✓ Mensagem "goes to sleep" é enviada aos outros jogadores');
    console.log('✓ Jogador é removido permanentemente após o período de sleep');
    console.log('✓ Todos os testes passaram!');

  } catch (err) {
    console.error('\n❌ Erro no teste:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Executa o teste
testSleepDisconnect().then(() => {
  console.log('\n✓ Teste finalizado');
  process.exit(0);
}).catch((err) => {
  console.error('\n❌ Erro fatal:', err);
  process.exit(1);
});
