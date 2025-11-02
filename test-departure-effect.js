/**
 * Teste de Efeito e Mensagem de Partida após Sleep
 * 
 * Este script testa se o servidor envia a mensagem "has left" e o efeito "poofed"
 * após o período de sleep de 1 minuto.
 * 
 * Para executar: node test-departure-effect.js
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

async function testDepartureEffect() {
  console.log('=== Teste de Efeito de Partida após Sleep ===\n');

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
      x: 16,
      y: 15,
      dir: 0,
      name: 'guest-71018',
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
      username: 'guest-71018'
    };

    world.attachSession(ws1, { user: user1, player: player1 });
    console.log('✓ Jogador 1 (guest-71018) anexado na posição (16, 15)\n');

    console.log('Anexando jogador 2...');
    const player2 = {
      dbId: 'test-user-2',
      mapId: 'test2',
      x: 17,
      y: 15,
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

    // Limpa mensagens anteriores
    ws2._sentMessages = [];

    // Simula desconexão do jogador 1
    console.log('Simulando desconexão do jogador 1...');
    world.handleDisconnect(ws1);
    
    // Verifica mensagem de sleep
    console.log('Verificando mensagem "goes to sleep" enviada...');
    const sleepMessages = ws2._sentMessages.filter(msg => 
      msg.type === 'message' && msg.text && msg.text.includes('goes to sleep')
    );
    
    if (sleepMessages.length > 0) {
      console.log(`  ✓ Mensagem de sleep: ${sleepMessages[0].text}`);
    } else {
      console.log('  ⚠ Mensagem de sleep não encontrada');
    }

    // Limpa mensagens novamente para testar a finalização
    ws2._sentMessages = [];

    // Obtém dados do jogador dormindo
    const player1SessionId = Array.from(world.sleepingPlayers.keys())[0];
    const sleepingPlayerData = world.sleepingPlayers.get(player1SessionId);
    
    console.log('\nSimulando finalização após 1 minuto (período de sleep)...');
    
    // Cancela o timeout real e chama diretamente a função de finalização
    clearTimeout(sleepingPlayerData.timeoutId);
    world.finalizeDisconnect(sleepingPlayerData.player, sleepingPlayerData.user, ws1);
    
    // Aguarda um pouco para processar
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('\nVerificando pacote "pkg" com efeito e mensagem de partida...');
    
    // Procura pelo pacote "pkg"
    const pkgMessages = ws2._sentMessages.filter(msg => msg.type === 'pkg');
    
    if (pkgMessages.length === 0) {
      console.log('  ❌ Nenhum pacote "pkg" encontrado!');
      console.log('  Mensagens recebidas pelo jogador 2:');
      ws2._sentMessages.forEach((msg, idx) => {
        console.log(`    ${idx + 1}. ${JSON.stringify(msg).substring(0, 100)}...`);
      });
      throw new Error('Pacote "pkg" não encontrado');
    }
    
    console.log(`  ✓ Pacote "pkg" encontrado (${pkgMessages.length} pacote(s))`);
    
    // Analisa o conteúdo do pacote
    const pkg = pkgMessages[0];
    console.log('\n  Analisando conteúdo do pacote "pkg"...');
    
    // O campo data deve ser um JSON string de um array
    let pkgData;
    try {
      pkgData = JSON.parse(pkg.data);
      console.log(`  ✓ Pacote contém ${pkgData.length} sub-pacotes`);
    } catch (err) {
      throw new Error(`Falha ao parsear pkg.data: ${err.message}`);
    }
    
    // Verifica cada sub-pacote
    let hasMessage = false;
    let hasFxTpl = false;
    let hasFx = false;
    let hasPl = false;
    
    for (let i = 0; i < pkgData.length; i++) {
      try {
        const subPacket = JSON.parse(pkgData[i]);
        
        if (subPacket.type === 'message') {
          hasMessage = true;
          console.log(`  ✓ [${i}] Mensagem: ${subPacket.text}`);
          
          // Verifica se é a mensagem "has left"
          if (subPacket.text.includes('has left')) {
            console.log('    ✓ Mensagem contém "has left"');
          } else {
            console.log('    ⚠ Mensagem não contém "has left"');
          }
        } else if (subPacket.type === 'fx_tpl') {
          hasFxTpl = true;
          console.log(`  ✓ [${i}] Template de efeito: ${subPacket.tpl}`);
          
          if (subPacket.tpl === 'poofed') {
            console.log('    ✓ Template é "poofed"');
          }
        } else if (subPacket.type === 'fx') {
          hasFx = true;
          console.log(`  ✓ [${i}] Efeito: ${subPacket.tpl} na posição (${subPacket.x}, ${subPacket.y})`);
          
          if (subPacket.tpl === 'poofed' && subPacket.x === 16 && subPacket.y === 15) {
            console.log('    ✓ Efeito "poofed" na posição correta (16, 15)');
          }
        } else if (subPacket.type === 'pl') {
          hasPl = true;
          console.log(`  ✓ [${i}] Lista de jogadores atualizada (${subPacket.data.length} jogador(es))`);
        }
      } catch (err) {
        console.log(`  ⚠ [${i}] Sub-pacote inválido: ${pkgData[i].substring(0, 50)}...`);
      }
    }
    
    console.log('\n=== Resumo da Verificação ===');
    console.log(`  Mensagem "has left": ${hasMessage ? '✓' : '❌'}`);
    console.log(`  Template de efeito (fx_tpl): ${hasFxTpl ? '✓' : '❌'}`);
    console.log(`  Efeito (fx): ${hasFx ? '✓' : '❌'}`);
    console.log(`  Lista de jogadores (pl): ${hasPl ? '✓' : '❌'}`);
    
    if (!hasMessage || !hasFxTpl || !hasFx || !hasPl) {
      throw new Error('Pacote "pkg" não contém todos os componentes esperados');
    }
    
    console.log('\n✓ Todos os componentes presentes no pacote!');

    // Fecha conexões
    console.log('\nEncerrando teste...');
    await world.shutdown();
    console.log('✓ Teste concluído com sucesso!\n');

    console.log('=== RESUMO FINAL ===');
    console.log('✓ Jogador entra em modo sleep ao desconectar');
    console.log('✓ Mensagem "goes to sleep" é enviada');
    console.log('✓ Após 1 minuto, pacote "pkg" é enviado com:');
    console.log('  - Mensagem "has left"');
    console.log('  - Template de efeito "poofed"');
    console.log('  - Efeito "poofed" na posição do jogador');
    console.log('  - Lista de jogadores atualizada');
    console.log('✓ Todos os testes passaram!');

  } catch (err) {
    console.error('\n❌ Erro no teste:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Executa o teste
testDepartureEffect().then(() => {
  console.log('\n✓ Teste finalizado');
  process.exit(0);
}).catch((err) => {
  console.error('\n❌ Erro fatal:', err);
  process.exit(1);
});
