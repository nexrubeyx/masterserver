/**
 * Teste de Usuários Padrão
 * 
 * Este script testa a funcionalidade de criação automática de usuários padrão
 * ao iniciar o servidor.
 * 
 * Para executar: node test-default-users.js
 */

import { loadEnv } from './src/config/env.js';
import { connectMongo, getDB } from './src/db/mongo.js';
import { createLogger } from './src/logger.js';
import { initializeDefaultUsers } from './src/services/defaultUsersService.js';
import { findUserByUsername } from './src/models/User.js';
import { getPlayerByUserId } from './src/models/Player.js';
import bcrypt from 'bcryptjs';

async function testDefaultUsers() {
  console.log('=== Teste de Usuários Padrão ===\n');

  // Carrega configurações
  const env = loadEnv();
  const logger = createLogger();

  try {
    // Conecta ao banco de dados
    await connectMongo(env, logger);
    console.log('✓ Conectado ao MongoDB\n');

    // Limpa usuários de teste se existirem (para garantir teste limpo)
    const db = getDB();
    await db.collection('users').deleteMany({ username: { $in: ['admin', 'tester'] } });
    await db.collection('players').deleteMany({ name: { $in: ['admin', 'tester'] } });
    console.log('✓ Banco limpo para teste\n');

    // Inicializa usuários padrão
    console.log('Inicializando usuários padrão...');
    await initializeDefaultUsers(env, logger);
    console.log();

    // Verifica se o usuário admin foi criado
    console.log('Verificando usuário "admin"...');
    const admin = await findUserByUsername('admin');
    if (!admin) {
      console.error('✗ FALHA: Usuário admin não foi criado');
      process.exit(1);
    }
    console.log('✓ Usuário admin existe');
    console.log(`  - ID: ${admin._id}`);
    console.log(`  - Username: ${admin.username}`);
    console.log(`  - Email: ${admin.email}`);
    console.log(`  - Permissão: ${admin.permission} (esperado: 4 = MASTER)`);
    
    // Verifica a senha do admin
    const adminPasswordOk = await bcrypt.compare('admin123', admin.passwordHash);
    if (!adminPasswordOk) {
      console.error('✗ FALHA: Senha do admin não confere');
      process.exit(1);
    }
    console.log('✓ Senha do admin correta');
    
    // Verifica se o personagem do admin foi criado
    const adminPlayer = await getPlayerByUserId(admin._id);
    if (!adminPlayer) {
      console.error('✗ FALHA: Personagem do admin não foi criado');
      process.exit(1);
    }
    console.log('✓ Personagem do admin existe');
    console.log(`  - Nome: ${adminPlayer.name}`);
    console.log(`  - Mapa: ${adminPlayer.mapId}`);
    console.log(`  - Posição: (${adminPlayer.x}, ${adminPlayer.y})\n`);

    // Verifica se o usuário tester foi criado
    console.log('Verificando usuário "tester"...');
    const tester = await findUserByUsername('tester');
    if (!tester) {
      console.error('✗ FALHA: Usuário tester não foi criado');
      process.exit(1);
    }
    console.log('✓ Usuário tester existe');
    console.log(`  - ID: ${tester._id}`);
    console.log(`  - Username: ${tester.username}`);
    console.log(`  - Email: ${tester.email}`);
    console.log(`  - Permissão: ${tester.permission} (esperado: 1 = PLAYER)`);
    
    // Verifica a senha do tester
    const testerPasswordOk = await bcrypt.compare('tester123', tester.passwordHash);
    if (!testerPasswordOk) {
      console.error('✗ FALHA: Senha do tester não confere');
      process.exit(1);
    }
    console.log('✓ Senha do tester correta');
    
    // Verifica se o personagem do tester foi criado
    const testerPlayer = await getPlayerByUserId(tester._id);
    if (!testerPlayer) {
      console.error('✗ FALHA: Personagem do tester não foi criado');
      process.exit(1);
    }
    console.log('✓ Personagem do tester existe');
    console.log(`  - Nome: ${testerPlayer.name}`);
    console.log(`  - Mapa: ${testerPlayer.mapId}`);
    console.log(`  - Posição: (${testerPlayer.x}, ${testerPlayer.y})\n`);

    // Teste de idempotência - executa novamente e verifica que não duplica
    console.log('Testando idempotência (executando novamente)...');
    await initializeDefaultUsers(env, logger);
    
    const db2 = getDB();
    const adminCount = await db2.collection('users').countDocuments({ username: 'admin' });
    const testerCount = await db2.collection('users').countDocuments({ username: 'tester' });
    
    if (adminCount !== 1 || testerCount !== 1) {
      console.error(`✗ FALHA: Usuários duplicados (admin: ${adminCount}, tester: ${testerCount})`);
      process.exit(1);
    }
    console.log('✓ Idempotência verificada - usuários não foram duplicados\n');

    console.log('=== TODOS OS TESTES PASSARAM ===');
    process.exit(0);

  } catch (error) {
    console.error('✗ ERRO:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testDefaultUsers();
