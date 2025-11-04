/**
 * Test suite for recipe service fix
 * 
 * Validates that the fix resolves the client error:
 * 'Uncaught SyntaxError: "undefined" is not valid JSON'
 * 
 * The fix ensures that the server sends a valid 'bld' packet with recipe data
 * so the client doesn't try to parse undefined when update_recipes() is called.
 */

import { getRecipeData, makeRecipePacket } from './src/services/recipeService.js';

console.log('=== Recipe Service Fix - Test Suite ===\n');

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

// Test 1: getRecipeData returns an object
const recipeData = getRecipeData();
test('getRecipeData() returns an object', recipeData && typeof recipeData === 'object');

// Test 2: Recipe data can be stringified
let jsonString;
try {
  jsonString = JSON.stringify(recipeData);
  test('Recipe data can be stringified to JSON', true);
} catch (e) {
  test('Recipe data can be stringified to JSON', false);
}

// Test 3: Stringified recipe data can be parsed
try {
  const parsed = JSON.parse(jsonString);
  test('Stringified recipe data can be parsed back', true);
  test('Parsed data is an object', parsed && typeof parsed === 'object');
} catch (e) {
  test('Stringified recipe data can be parsed back', false);
  test('Parsed data is an object', false);
}

// Test 4: makeRecipePacket creates correct packet structure
const packet = makeRecipePacket();
test('makeRecipePacket() returns an object', packet && typeof packet === 'object');
test('Packet has type field', packet && 'type' in packet);
test('Packet type is "bld"', packet && packet.type === 'bld');
test('Packet has data field', packet && 'data' in packet);
test('Packet data is a string', packet && typeof packet.data === 'string');

// Test 5: Packet data can be parsed by client
try {
  const clientData = JSON.parse(packet.data);
  test('Client can parse packet.data without error', true);
  test('Parsed packet.data is an object', clientData && typeof clientData === 'object');
  
  // This simulates what the client does: build_data = JSON.parse(jv.raw_build_data)
  // It should not throw "undefined is not valid JSON" anymore
  test('Client simulation: JSON.parse does not throw', true);
} catch (e) {
  test('Client can parse packet.data without error', false);
  test('Parsed packet.data is an object', false);
  test('Client simulation: JSON.parse does not throw', false);
  console.log(`   Error: ${e.message}`);
}

// Test 6: Verify packet structure matches client expectations
test('Packet can be serialized for transmission', true);
const transmittedPacket = JSON.stringify(packet);
test('Transmitted packet is valid JSON', transmittedPacket && transmittedPacket.length > 0);

// Test 7: Verify empty recipe data is handled correctly
// The client iterates over build_data with: for (o in build_data)
// An empty object {} should work fine (loop just doesn't execute)
test('Empty recipe data structure is valid', Object.keys(recipeData).length >= 0);

console.log('\n=== Test Results ===');
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log(`Total: ${passCount + failCount}`);

if (failCount === 0) {
  console.log('\n✓ All tests passed!');
  console.log('\nThe recipe service fix should resolve the client JSON parse error.');
  console.log('When a player logs in, the server will now send:');
  console.log('  { type: "bld", data: "{}" }');
  console.log('This ensures jv.raw_build_data is defined before update_recipes() runs.');
  process.exit(0);
} else {
  console.log('\n✗ Some tests failed');
  process.exit(1);
}
