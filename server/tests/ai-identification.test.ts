import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAnswer } from '../src/services/answer-normalization.ts';
import { identificationQuestionSchema } from '../src/ai/schemas/quiz-question.ts';
test('P4-T18 identification normalization preserves punctuation and explicit distinct variants', () => {
  assert.equal(normalizeAnswer('  ＴＣＰ/IP  '), 'tcp/ip');
  assert.equal(
    normalizeAnswer('Transmission   Control\nProtocol'),
    'transmission control protocol',
  );
  assert.notEqual(normalizeAnswer('C++'), normalizeAnswer('C'));
  assert.notEqual(normalizeAnswer('TCP/IP'), normalizeAnswer('TCP IP'));
  const question = {
    type: 'IDENTIFICATION',
    prompt: 'Transport?',
    explanation: null,
    sourceKeys: ['note:a'],
    acceptedAnswers: ['TCP', ' tcp ', 'Transmission control protocol'],
  };
  const value = identificationQuestionSchema.parse(question);
  assert.deepEqual(value.acceptedAnswers, ['tcp', 'transmission control protocol']);
  assert.ok(
    !identificationQuestionSchema.safeParse({ ...question, acceptedAnswers: ['  \t '] })
      .success,
  );
  assert.ok(
    !identificationQuestionSchema.safeParse({ ...question, correctOptionIds: ['forged'] })
      .success,
  );
});
