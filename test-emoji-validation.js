// Test emoji validation logic

function isValidEmoji(str) {
  if (!str || str.trim().length === 0) return false;
  const emojiRegex = /[\p{Emoji}\p{Emoji_Presentation}]/u;
  return emojiRegex.test(str);
}

const testCases = [
  { input: 'curling_stone', expected: false },
  { input: '🥌', expected: true },
  { input: 'package', expected: false },
  { input: '📦', expected: true },
  { input: '🚚', expected: true },
  { input: 'smile', expected: false },
  { input: '😊', expected: true },
  { input: '', expected: false },
  { input: null, expected: false },
  { input: undefined, expected: false },
];

console.log('Testing Emoji Validation:\n');

let passed = 0;
let failed = 0;

testCases.forEach(({ input, expected }) => {
  const result = isValidEmoji(input);
  const status = result === expected ? '✅ PASS' : '❌ FAIL';

  if (result === expected) {
    passed++;
  } else {
    failed++;
  }

  console.log(`${status}: isValidEmoji("${input}") = ${result} (expected: ${expected})`);
});

console.log(`\n${passed}/${testCases.length} tests passed`);

if (failed === 0) {
  console.log('\n✅ All validation tests passed!');
} else {
  console.log(`\n❌ ${failed} test(s) failed`);
}
