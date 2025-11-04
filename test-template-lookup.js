/**
 * Test suite for template lookup fix
 * 
 * Validates that the fix resolves the client error:
 * "Cannot read properties of undefined (reading 'name')"
 * 
 * The fix allows findTemplate() to accept both string and numeric IDs,
 * preventing undefined lookups when template IDs have type mismatches.
 */

import { findTemplate, getAllTemplates } from './src/services/templateService.js';

console.log('=== Template Lookup Fix - Test Suite ===\n');

let passCount = 0;
let failCount = 0;

function test(description, condition) {
  if (condition) {
    console.log(`✓ ${description}`);
    passCount++;
  } else {
    console.log(`✗ ${description}`);
    failCount++;
  }
}

// Test 1: Numeric lookup (original behavior)
const t1Num = findTemplate(1);
test('findTemplate(1) returns a template object', t1Num && typeof t1Num === 'object');
test('findTemplate(1) has name property', t1Num && typeof t1Num.name === 'string');

// Test 2: String lookup (newly fixed behavior)
const t1Str = findTemplate('1');
test('findTemplate("1") returns a template object', t1Str && typeof t1Str === 'object');
test('findTemplate("1") has name property', t1Str && typeof t1Str.name === 'string');

// Test 3: Consistency check
test('findTemplate(1) === findTemplate("1")', t1Num === t1Str);

// Test 4: Multiple template IDs
const t2 = findTemplate(2);
const t2Str = findTemplate('2');
test('findTemplate(2) === findTemplate("2")', t2 === t2Str);

const t10 = findTemplate(10);
const t10Str = findTemplate('10');
test('findTemplate(10) === findTemplate("10")', t10 === t10Str);

// Test 5: Non-existent templates
const t99 = findTemplate(99);
const t99Str = findTemplate('99');
test('findTemplate(99) returns undefined', t99 === undefined);
test('findTemplate("99") returns undefined', t99Str === undefined);

const tInvalid = findTemplate('nonexistent');
test('findTemplate("nonexistent") returns undefined', tInvalid === undefined);

// Test 6: All templates are findable both ways
const allTemplates = getAllTemplates();
console.log(`\nTesting ${allTemplates.length} templates for bidirectional lookup...`);

let bidirectionalSuccess = true;
for (const template of allTemplates) {
  const foundByNum = findTemplate(template.tpl);
  const foundByStr = findTemplate(String(template.tpl));
  
  if (foundByNum !== template || foundByStr !== template) {
    console.log(`✗ Template ${template.tpl} failed bidirectional lookup`);
    bidirectionalSuccess = false;
  }
}

if (bidirectionalSuccess) {
  console.log(`✓ All ${allTemplates.length} templates are findable by both number and string`);
  passCount++;
} else {
  failCount++;
}

// Test 7: Template packet structure validation
test('Templates have required fields', allTemplates.every(t => 
  t.tpl != null && 
  typeof t.name === 'string' && 
  typeof t.spr === 'number'
));

// Summary
console.log(`\n=== Test Results ===`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log(`Total: ${passCount + failCount}`);

if (failCount === 0) {
  console.log('\n✓ All tests passed! Template lookup fix is working correctly.');
  process.exit(0);
} else {
  console.log('\n✗ Some tests failed. Please review the fix.');
  process.exit(1);
}
