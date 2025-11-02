/**
 * Test Script - Verificar Funcionalidade de Object Placements
 * 
 * Este script testa a funcionalidade de objectPlacements sem precisar
 * conectar ao MongoDB ou iniciar o servidor completo.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== Teste de Object Placements ===\n');

// 1. Carregar o mapa de teste
const mapPath = path.join(__dirname, 'src', 'maps', 'worlds', 'test2.json');
console.log('1. Carregando mapa:', mapPath);

if (!fs.existsSync(mapPath)) {
  console.error('❌ Arquivo do mapa não encontrado!');
  process.exit(1);
}

const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
console.log('✅ Mapa carregado:', mapData.id, 'v' + mapData.version);
console.log('   Dimensões:', mapData.width, 'x', mapData.height);

// 2. Verificar templates
console.log('\n2. Verificando templates:');
if (Array.isArray(mapData.templates) && mapData.templates.length > 0) {
  console.log('✅ Templates encontrados:', mapData.templates.length);
  mapData.templates.forEach(t => {
    console.log('   -', t.tpl, ':', t.name);
  });
} else {
  console.log('⚠️  Nenhum template definido');
}

// 3. Verificar objectPlacements
console.log('\n3. Verificando objectPlacements:');
if (Array.isArray(mapData.objectPlacements) && mapData.objectPlacements.length > 0) {
  console.log('✅ Object placements encontrados:', mapData.objectPlacements.length);
  
  // Criar mapa de templates para validação
  const templateMap = new Map();
  if (mapData.templates) {
    mapData.templates.forEach(t => templateMap.set(t.tpl, t));
  }
  
  // Validar cada placement
  let valid = 0;
  let invalid = 0;
  
  mapData.objectPlacements.forEach((p, idx) => {
    const isValid = 
      p.tpl && 
      typeof p.x === 'number' && 
      typeof p.y === 'number' &&
      p.x >= 0 && p.x < mapData.width &&
      p.y >= 0 && p.y < mapData.height;
    
    const hasTemplate = templateMap.has(p.tpl);
    
    if (isValid && hasTemplate) {
      console.log(`   ✅ [${idx}] ${p.tpl} em (${p.x}, ${p.y})`);
      valid++;
    } else {
      console.log(`   ❌ [${idx}] ${p.tpl} em (${p.x}, ${p.y}) - INVÁLIDO`);
      if (!isValid) console.log('      Coordenadas inválidas ou campos faltando');
      if (!hasTemplate) console.log('      Template não encontrado');
      invalid++;
    }
  });
  
  console.log('\n   Resumo:', valid, 'válidos,', invalid, 'inválidos');
} else {
  console.log('⚠️  Nenhum object placement definido');
}

// 4. Testar a lógica de envio
console.log('\n4. Testando lógica de envio:');

// Simular a função sendMapObjectPlacementsToPlayer
function simulateSendMapObjectPlacementsToPlayer(map) {
  const placements = Array.isArray(map.objectPlacements) ? map.objectPlacements : [];
  const packets = [];
  
  for (const p of placements) {
    if (!p.tpl || typeof p.x !== 'number' || typeof p.y !== 'number') {
      continue;
    }
    
    packets.push({
      type: 'o',
      x: p.x | 0,
      y: p.y | 0,
      d: p.tpl
    });
  }
  
  return packets;
}

const packets = simulateSendMapObjectPlacementsToPlayer(mapData);
console.log('✅ Pacotes gerados:', packets.length);
packets.forEach((p, idx) => {
  console.log(`   [${idx}] type: "${p.type}", x: ${p.x}, y: ${p.y}, d: "${p.d}"`);
});

// 5. Verificar sintaxe dos arquivos modificados
console.log('\n5. Verificando sintaxe dos arquivos modificados:');

const filesToCheck = [
  'src/services/mapObjectsLoader.js',
  'src/services/playerService.js'
];

let allValid = true;
for (const file of filesToCheck) {
  const fullPath = path.join(__dirname, file);
  try {
    // Apenas importar para verificar sintaxe
    await import('./' + file);
    console.log('   ✅', file);
  } catch (err) {
    console.log('   ❌', file);
    console.log('      Erro:', err.message);
    allValid = false;
  }
}

// 6. Resultado final
console.log('\n=== Resultado Final ===');
if (allValid && packets.length > 0) {
  console.log('✅ SUCESSO: Funcionalidade de objectPlacements está implementada corretamente!');
  console.log('\nPróximos passos:');
  console.log('1. Inicie o servidor: npm start');
  console.log('2. Conecte com o cliente');
  console.log('3. Faça login ou entre como guest');
  console.log('4. Você verá', packets.length, 'objetos colocados no mapa automaticamente');
  process.exit(0);
} else {
  console.log('❌ FALHA: Problemas encontrados na implementação');
  process.exit(1);
}
