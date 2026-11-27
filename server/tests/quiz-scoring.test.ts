import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreAnswer,
  scoreAttempt,
  type ScoringQuestion,
} from '../src/services/quiz-scoring.service.ts';
const choice: ScoringQuestion = {
  id: 'q',
  type: 'MULTIPLE_SELECT',
  options: [
    { id: 'a', isCorrect: true },
    { id: 'b', isCorrect: true },
    { id: 'c', isCorrect: false },
  ],
  acceptedAnswers: [],
};
test('P5-T09 deterministic scoring rejects forged/duplicate IDs and gives no partial multiple-select credit', () => {
  for (const [ids, correct] of [
    [['b', 'a'], true],
    [['a'], false],
    [['a', 'c'], false],
    [[], false],
  ] as const)
    assert.equal(scoreAnswer(choice, { optionIds: [...ids] }).isCorrect, correct);
  assert.throws(() => scoreAnswer(choice, { optionIds: ['a', 'a'] }), /invalid options/);
  assert.throws(() => scoreAnswer(choice, { optionIds: ['foreign'] }), /invalid options/);
  for (const type of ['MULTIPLE_CHOICE', 'TRUE_FALSE'] as const) {
    const single = {
      ...choice,
      type,
      options: [
        { id: 'a', isCorrect: true },
        { id: 'b', isCorrect: false },
      ],
    };
    assert.equal(scoreAnswer(single, { optionIds: ['a'] }).isCorrect, true);
    assert.equal(scoreAnswer(single, { optionIds: ['b'] }).isCorrect, false);
    assert.throws(() => scoreAnswer(single, { optionIds: ['a', 'b'] }));
  }
});
test('P5-T09 identification preserves punctuation and skips remain separate from wrong answers', () => {
  const text: ScoringQuestion = {
    id: 'text',
    type: 'IDENTIFICATION',
    options: [],
    acceptedAnswers: ['tcp/ip', 'Transmission control protocol'],
  };
  assert.equal(scoreAnswer(text, { text: '  ＴＣＰ/IP ' }).isCorrect, true);
  assert.equal(
    scoreAnswer(text, { text: 'Transmission  control\nprotocol' }).isCorrect,
    true,
  );
  assert.equal(scoreAnswer(text, { text: 'tcp ip' }).isCorrect, false);
  assert.equal(scoreAnswer(text, { text: 'A reliable protocol' }).isCorrect, false);
  assert.equal(scoreAnswer(text, { text: '  ' }).answered, false);
  assert.throws(() => scoreAnswer(text, { optionIds: ['a'] }));
  const total = scoreAttempt([choice, text], new Map([['q', { optionIds: ['a'] }]]));
  assert.equal(total.incorrectCount, 1);
  assert.equal(total.unansweredCount, 1);
  assert.equal(total.percentage, 0);
  assert.equal(scoreAttempt([], new Map()).percentage, null);
});
