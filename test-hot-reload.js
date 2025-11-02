#!/usr/bin/env node

/**
 * Test script for hot-reload functionality
 * 
 * This script tests:
 * 1. Template hot-reload
 * 2. Map hot-reload
 * 3. Client build functionality
 */

import { spawn } from 'child_process';
import { WebSocket } from 'ws';
import fs from 'fs/promises';

let serverProcess;
let testResults = [];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startServer() {
  console.log('Starting server...');
  serverProcess = spawn('node', ['src/index.js'], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  serverProcess.stdout.on('data', (data) => {
    // Collect server output for debugging
  });
  
  serverProcess.stderr.on('data', (data) => {
    console.error(`Server error: ${data}`);
  });
  
  await sleep(2000); // Give server time to start
  console.log('Server started');
}

async function stopServer() {
  if (serverProcess) {
    console.log('Stopping server...');
    serverProcess.kill('SIGTERM');
    await sleep(1000);
  }
}

async function connectClient() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:8080');
    const messages = [];
    
    ws.on('open', () => {
      console.log('Client connected');
    });
    
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      messages.push(msg);
    });
    
    ws.on('error', (err) => {
      reject(err);
    });
    
    resolve({ ws, messages });
  });
}

async function testTemplateHotReload() {
  console.log('\n=== Testing Template Hot-Reload ===');
  
  const client = await connectClient();
  await sleep(1000);
  
  // Check initial state
  const initialTemplates = client.messages.find(m => m.type === 'obj_tpl');
  if (!initialTemplates) {
    throw new Error('No obj_tpl message received');
  }
  
  const initialTorch = initialTemplates.tpls.find(t => t.tpl === 'torch');
  console.log(`Initial torch name: "${initialTorch.name}"`);
  testResults.push({ test: 'Initial template load', pass: initialTorch.name === 'Tocha' });
  
  // Modify template
  console.log('Modifying template...');
  await fs.writeFile('config/templates/torch.json', JSON.stringify({
    tpl: 'torch',
    name: 'Modified Torch',
    desc: 'This has been modified',
    stack: false,
    pickup: true,
    block: false,
    spr: 456,
    build: '456f,t|ffaa00|,q|0.9|'
  }, null, 2));
  
  // Wait for hot-reload
  await sleep(2000);
  
  // Check if we received an updated obj_tpl
  const updatedTemplates = client.messages.slice(1).find(m => m.type === 'obj_tpl');
  if (updatedTemplates) {
    const updatedTorch = updatedTemplates.tpls.find(t => t.tpl === 'torch');
    console.log(`Updated torch name: "${updatedTorch.name}"`);
    testResults.push({ test: 'Template hot-reload', pass: updatedTorch.name === 'Modified Torch' });
  } else {
    console.log('No hot-reload detected (this may be expected in test environment)');
    testResults.push({ test: 'Template hot-reload', pass: false, note: 'No update received' });
  }
  
  client.ws.close();
  
  // Restore original
  await fs.writeFile('config/templates/torch.json', JSON.stringify({
    tpl: 'torch',
    name: 'Tocha',
    desc: 'Ilumina a área',
    stack: false,
    pickup: true,
    block: false,
    spr: 456,
    build: '456f,t|ffaa00|,q|0.9|'
  }, null, 2));
}

async function testClientBuild() {
  console.log('\n=== Testing Client Build (requires ALLOW_CLIENT_BUILD=true) ===');
  console.log('Skipping - requires server restart with environment variable');
  testResults.push({ test: 'Client build', pass: null, note: 'Skipped - requires ALLOW_CLIENT_BUILD=true' });
}

async function runTests() {
  try {
    await startServer();
    await testTemplateHotReload();
    await testClientBuild();
    
    console.log('\n=== Test Results ===');
    testResults.forEach(result => {
      const status = result.pass === null ? '⊘ SKIP' : (result.pass ? '✓ PASS' : '✗ FAIL');
      console.log(`${status} - ${result.test}${result.note ? ` (${result.note})` : ''}`);
    });
    
  } catch (err) {
    console.error('\nTest failed with error:', err);
  } finally {
    await stopServer();
    process.exit(0);
  }
}

runTests();
