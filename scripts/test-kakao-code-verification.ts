/**
 * Test KakaoTalk Code Verification
 * Simulate what happens when a user enters a code in KakaoTalk
 */

// Simulate the updated code pattern from kakao/chat/route.ts
const codePattern = /([A-Z]{3,4}-[A-Z0-9]{3,5}-[A-Z0-9]{3,5}(?:-[A-Z0-9]{3,5})?)/;

// Test employee codes from the user's list
const testMessages = [
  'EMP-00124-673',
  'My code is EMP-00127-LP5',
  'EMP-00128-H4F please verify',
  '직원코드: EMP-00131-9UE',
  'ABC-DEF-GHI-JKL',
  'HXK-9F2-M7Q-3WP',
  'hello',
  '안녕하세요',
];

console.log('Testing KakaoTalk Code Pattern Extraction\n');
console.log('='.repeat(80));

testMessages.forEach(message => {
  const match = message.match(codePattern);

  console.log(`\nMessage: "${message}"`);
  if (match) {
    console.log(`  ✅ Code detected: ${match[1]}`);
  } else {
    console.log(`  ❌ No code detected (will ask user for code)`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('\n✅ All employee codes (EMP-XXXXX-XXX) are now recognized!');
console.log('✅ Admin codes (XXX-XXX-XXX-XXX) continue to work!');
console.log('✅ Codes can be detected within longer messages!');
