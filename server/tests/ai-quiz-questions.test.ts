import { test } from 'node:test';
import assert from 'node:assert/strict';
import { choiceQuestionSchema } from '../src/ai/schemas/quiz-question.ts';
const base = {
  prompt: 'Choose a protocol',
  explanation: 'Transport',
  sourceKeys: ['note:a'],
  options: [
    { id: 'a', text: 'TCP' },
    { id: 'b', text: 'UDP' },
    { id: 'c', text: 'IP' },
  ],
  correctOptionIds: ['a'],
};
test('P4-T17 choice keys reference unique real choices with correct cardinality', () => {
  assert.ok(choiceQuestionSchema.safeParse({ ...base, type: 'MULTIPLE_CHOICE' }).success);
  assert.ok(
    choiceQuestionSchema.safeParse({
      ...base,
      type: 'MULTIPLE_SELECT',
      correctOptionIds: ['a', 'b'],
    }).success,
  );
  assert.ok(
    choiceQuestionSchema.safeParse({
      ...base,
      type: 'TRUE_FALSE',
      options: [
        { id: 't', text: 'True' },
        { id: 'f', text: 'False' },
      ],
      correctOptionIds: ['t'],
    }).success,
  );
  for (const invalid of [
    { ...base, type: 'MULTIPLE_CHOICE', correctOptionIds: ['missing'] },
    { ...base, type: 'MULTIPLE_CHOICE', options: [base.options[0], base.options[0]] },
    {
      ...base,
      type: 'MULTIPLE_CHOICE',
      options: [
        { id: 'a', text: 'TCP' },
        { id: 'b', text: 'tcp' },
      ],
    },
    { ...base, type: 'TRUE_FALSE' },
    { ...base, type: 'MULTIPLE_SELECT', correctOptionIds: ['a'] },
    { ...base, type: 'MULTIPLE_SELECT', correctOptionIds: ['a', 'b', 'c'] },
  ])
    assert.ok(!choiceQuestionSchema.safeParse(invalid).success);
});
