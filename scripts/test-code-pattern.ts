/**
 * Test Code Pattern Matching
 * Verify that employee codes match the regex pattern
 */

// Current pattern in kakao/chat/route.ts
const currentPattern = /([A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3})/;

// Proposed new pattern that matches employee codes
const newPattern = /(EMP-[0-9]{5}-[A-Z0-9]{3})/;

// General pattern that matches both formats
const generalPattern = /([A-Z]{3,4}-[A-Z0-9]{3,5}-[A-Z0-9]{3,5}(?:-[A-Z0-9]{3,5})?)/;

// Sample codes
const testCodes = [
  'EMP-00124-673',
  'EMP-00127-LP5',
  'EMP-00128-H4F',
  'ABC-DEF-GHI-JKL',  // Old admin format
  'HXK-9F2-M7Q-3WP',  // Example from the KakaoTalk response
];

console.log('Testing Code Pattern Matching\n');
console.log('='.repeat(80));

testCodes.forEach(code => {
  console.log(`\nCode: ${code}`);
  console.log('  Current pattern:', currentPattern.test(code) ? '✅ MATCH' : '❌ NO MATCH');
  console.log('  New pattern:', newPattern.test(code) ? '✅ MATCH' : '❌ NO MATCH');
  console.log('  General pattern:', generalPattern.test(code) ? '✅ MATCH' : '❌ NO MATCH');

  if (generalPattern.test(code)) {
    const match = code.match(generalPattern);
    console.log('  Extracted:', match?.[1]);
  }
});

console.log('\n' + '='.repeat(80));
console.log('\nConclusion:');
console.log('❌ Current pattern does NOT match employee codes (EMP-00124-673)');
console.log('✅ New pattern matches employee codes specifically');
console.log('✅ General pattern matches BOTH employee and admin codes');
console.log('\nRecommendation: Use the general pattern to support both formats');
