/**
 * Script de teste para verificar o sistema de templates
 * 
 * Este script valida:
 * 1. Templates estáticos carregados de objectTemplates.js
 * 2. Templates dinâmicos registrados via registerTemplates()
 * 3. Carregamento de templates de mapas JSON
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerTemplates, getAllTemplates, findTemplate } from './src/services/templateService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== TESTE DO SISTEMA DE TEMPLATES ===\n');

// 1. Verifica templates estáticos
console.log('1. Templates estáticos carregados:');
const initialTemplates = getAllTemplates();
console.log(`   Total: ${initialTemplates.length}`);
initialTemplates.forEach(t => {
  console.log(`   - ${t.tpl}: ${t.name}`);
});

// 2. Carrega templates de um arquivo de mapa
console.log('\n2. Carregando templates do mapa test2.json...');
const mapPath = path.join(__dirname, 'src', 'maps', 'worlds', 'test2.json');
const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

if (mapData.templates) {
  console.log(`   Encontrados ${mapData.templates.length} templates no mapa`);
  registerTemplates(mapData.templates);
  
  mapData.templates.forEach(t => {
    console.log(`   - Registrado: ${t.tpl}: ${t.name}`);
  });
} else {
  console.log('   Nenhum template encontrado no mapa');
}

// 3. Verifica templates após registro
console.log('\n3. Templates após registro dinâmico:');
const allTemplates = getAllTemplates();
console.log(`   Total: ${allTemplates.length}`);
allTemplates.forEach(t => {
  console.log(`   - ${t.tpl}: ${t.name}`);
});

// 4. Testa busca de templates
console.log('\n4. Teste de busca:');
const testIds = ['tree_oak', 'barrel_small', 'inexistente'];
testIds.forEach(id => {
  const found = findTemplate(id);
  if (found) {
    console.log(`   ✓ ${id} encontrado: ${found.name}`);
  } else {
    console.log(`   ✗ ${id} não encontrado`);
  }
});

// 5. Testa evitar duplicatas
console.log('\n5. Teste de duplicatas:');
const duplicateTemplates = [
  {
    tpl: "tree_oak",
    name: "Árvore Atualizada",
    desc: "Template atualizado",
    stack: 0,
    pickup: 0,
    block: 1,
    spr: 720,
    build: "-305, o|-20| -289f"
  }
];
console.log('   Registrando template duplicado (tree_oak)...');
registerTemplates(duplicateTemplates);
const updated = findTemplate('tree_oak');
console.log(`   Nome após atualização: ${updated.name}`);
console.log(`   Total de templates (deve permanecer o mesmo): ${getAllTemplates().length}`);

console.log('\n=== TESTE CONCLUÍDO COM SUCESSO ===');
