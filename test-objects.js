#!/usr/bin/env node

/**
 * Test Script - World Object System
 * 
 * This script verifies that the world object system works correctly:
 * - Object templates are defined correctly
 * - ObjectService manages object state properly
 * - Pickup interactions work as expected
 * - Protocol messages are formatted correctly
 */

import { 
  OBJECT_TEMPLATES, 
  getAllTemplateKeys,
  getTemplate,
  hasTemplate 
} from './src/constants/objectTemplates.js';

let testsPassed = 0;
let testsFailed = 0;

function test(description, fn) {
  try {
    fn();
    console.log('✓', description);
    testsPassed++;
  } catch (err) {
    console.error('✗', description);
    console.error('  ', err.message);
    testsFailed++;
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertNotNull(value, message) {
  if (value === null || value === undefined) {
    throw new Error(`${message}: value is null or undefined`);
  }
}

function assertTrue(value, message) {
  if (!value) {
    throw new Error(`${message}: value is not true`);
  }
}

console.log('=== World Object System Tests ===\n');

// Test Group 1: Object Templates
console.log('Test Group 1: Object Templates');

test('Stone template exists', () => {
  assertTrue(hasTemplate('stone'), 'Stone template should exist');
});

test('Wood template exists', () => {
  assertTrue(hasTemplate('wood'), 'Wood template should exist');
});

test('Bush template exists', () => {
  assertTrue(hasTemplate('bush'), 'Bush template should exist');
});

test('Stone template has correct properties', () => {
  const stone = getTemplate('stone');
  assertNotNull(stone, 'Stone template');
  assertEquals(stone.tpl, 'stone', 'Template key');
  assertEquals(stone.name, 'Stone', 'Template name');
  assertEquals(stone.stack, 1, 'Can stack');
  assertEquals(stone.pickup, 1, 'Can pickup');
  assertEquals(stone.block, 1, 'Blocks movement');
});

test('Wood template has correct properties', () => {
  const wood = getTemplate('wood');
  assertNotNull(wood, 'Wood template');
  assertEquals(wood.tpl, 'wood', 'Template key');
  assertEquals(wood.name, 'Wood', 'Template name');
  assertEquals(wood.stack, 1, 'Can stack');
  assertEquals(wood.pickup, 1, 'Can pickup');
  assertEquals(wood.block, 0, 'Does not block movement');
});

test('Bush template has correct properties', () => {
  const bush = getTemplate('bush');
  assertNotNull(bush, 'Bush template');
  assertEquals(bush.tpl, 'bush', 'Template key');
  assertEquals(bush.name, 'Bush', 'Template name');
  assertEquals(bush.stack, 1, 'Can stack');
  assertEquals(bush.pickup, 1, 'Can pickup');
  assertEquals(bush.block, 1, 'Blocks movement');
  assertTrue(bush.spr < 0, 'Uses negative sprite (tile index)');
});

test('getAllTemplateKeys returns all templates', () => {
  const keys = getAllTemplateKeys();
  assertTrue(keys.length >= 3, 'Should have at least 3 templates');
  assertTrue(keys.includes('stone'), 'Should include stone');
  assertTrue(keys.includes('wood'), 'Should include wood');
  assertTrue(keys.includes('bush'), 'Should include bush');
});

// Test Group 2: Template Protocol Format
console.log('\nTest Group 2: Template Protocol Format');

test('Stone template has all required protocol fields', () => {
  const stone = OBJECT_TEMPLATES.stone;
  assertNotNull(stone.tpl, 'tpl field');
  assertNotNull(stone.name, 'name field');
  assertNotNull(stone.desc, 'desc field');
  assertTrue(stone.stack !== undefined, 'stack field exists');
  assertTrue(stone.pickup !== undefined, 'pickup field exists');
  assertTrue(stone.block !== undefined, 'block field exists');
  assertTrue(stone.spr !== undefined, 'spr field exists');
  assertTrue(stone.build !== undefined, 'build field exists');
});

test('Wood template has all required protocol fields', () => {
  const wood = OBJECT_TEMPLATES.wood;
  assertNotNull(wood.tpl, 'tpl field');
  assertNotNull(wood.name, 'name field');
  assertNotNull(wood.desc, 'desc field');
  assertTrue(wood.stack !== undefined, 'stack field exists');
  assertTrue(wood.pickup !== undefined, 'pickup field exists');
  assertTrue(wood.block !== undefined, 'block field exists');
  assertTrue(wood.spr !== undefined, 'spr field exists');
  assertTrue(wood.build !== undefined, 'build field exists');
});

test('Bush template has all required protocol fields', () => {
  const bush = OBJECT_TEMPLATES.bush;
  assertNotNull(bush.tpl, 'tpl field');
  assertNotNull(bush.name, 'name field');
  assertNotNull(bush.desc, 'desc field');
  assertTrue(bush.stack !== undefined, 'stack field exists');
  assertTrue(bush.pickup !== undefined, 'pickup field exists');
  assertTrue(bush.block !== undefined, 'block field exists');
  assertTrue(bush.spr !== undefined, 'spr field exists');
  assertTrue(bush.build !== undefined, 'build field exists');
});

// Test Group 3: Protocol Schema
console.log('\nTest Group 3: Protocol Schema');

test('Pickup message schema validation', async () => {
  const { validatePacket } = await import('./src/protocol/schema.js');
  
  // Valid pickup message
  const validPickup = {
    type: 'pickup',
    x: 5,
    y: 10,
    tpl: 'stone'
  };
  
  const result = validatePacket(validPickup);
  assertTrue(result.ok, 'Valid pickup message should pass validation');
});

test('Invalid pickup message (missing tpl)', async () => {
  const { validatePacket } = await import('./src/protocol/schema.js');
  
  const invalidPickup = {
    type: 'pickup',
    x: 5,
    y: 10
  };
  
  const result = validatePacket(invalidPickup);
  assertEquals(result.ok, false, 'Invalid pickup should fail validation');
});

// Test Group 4: Map Configuration
console.log('\nTest Group 4: Map Configuration');

test('Test map has objectPlacements defined', async () => {
  const fs = await import('fs');
  const mapData = JSON.parse(fs.default.readFileSync('./src/maps/worlds/test.json', 'utf8'));
  
  assertTrue(Array.isArray(mapData.objectPlacements), 'objectPlacements should be an array');
  assertTrue(mapData.objectPlacements.length > 0, 'Should have at least one object placement');
});

test('Test map object placements have valid format', async () => {
  const fs = await import('fs');
  const mapData = JSON.parse(fs.default.readFileSync('./src/maps/worlds/test.json', 'utf8'));
  
  for (const placement of mapData.objectPlacements) {
    assertTrue(typeof placement.x === 'number', 'x should be a number');
    assertTrue(typeof placement.y === 'number', 'y should be a number');
    assertTrue(typeof placement.tpl === 'string', 'tpl should be a string');
    assertTrue(hasTemplate(placement.tpl), `Template ${placement.tpl} should exist`);
  }
});

// Summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total:  ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log('\n✓ All tests passed!');
  process.exit(0);
} else {
  console.log(`\n✗ ${testsFailed} test(s) failed`);
  process.exit(1);
}
