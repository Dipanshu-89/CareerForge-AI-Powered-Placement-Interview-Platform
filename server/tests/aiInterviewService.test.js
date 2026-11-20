
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.GEMINI_API_KEY = '';

const {
  evaluateInterviewAnswer,
  generateOverallFeedback
} = require('../services/aiInterviewService');

// Test 1: Empty answer should return zero score
test('Empty answer should return zero score', async () => {
  const result = await evaluateInterviewAnswer(
    'What is React?',
    ['components'],
    ''
  );

  assert.equal(result.score, 0);
  assert.equal(result.accuracy, 0);
  assert.equal(result.clarity, 0);
  assert.equal(result.depth, 0);
});

// Test 2: Whitespace-only answer should return zero
test('Whitespace-only answer should return zero score', async () => {
  const result = await evaluateInterviewAnswer(
    'What is Node.js?',
    ['runtime'],
    '    '
  );

  assert.equal(result.score, 0);
});

// Test 3: Empty interview should return zero overall score
test('Empty interview should return zero overall score', () => {
  const result = generateOverallFeedback([]);

  assert.equal(result.totalScore, 0);
  assert.deepEqual(result.topStrengths, []);
});

// Test 4: Invalid scores should be ignored
test('Invalid evaluation scores should be ignored', () => {
  const questions = [
    { evaluation: { score: 80 } },
    { evaluation: { score: 150 } },
    { evaluation: { score: -10 } },
    { evaluation: { score: 60 } }
  ];

  const result = generateOverallFeedback(questions);

  assert.equal(result.totalScore, 70);
});

// Test 5: No valid scores should return zero
test('No valid evaluations should return zero score', () => {
  const questions = [
    { evaluation: { score: 150 } },
    { evaluation: { score: -20 } },
    { evaluation: { score: 'invalid' } }
  ];

  const result = generateOverallFeedback(questions);

  assert.equal(result.totalScore, 0);
  assert.equal(
    result.overallFeedback,
    'No valid interview evaluations available.'
  );
});

// Test 6: Valid scores should calculate correct average
test('Valid evaluations should calculate correct average', () => {
  const questions = [
    { evaluation: { score: 80 } },
    { evaluation: { score: 90 } },
    { evaluation: { score: 70 } }
  ];

  const result = generateOverallFeedback(questions);

  assert.equal(result.totalScore, 80);
});

