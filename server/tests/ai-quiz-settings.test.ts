import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quizSettingsSchema } from '../src/utils/input-validators/quizzes.ts';
const settings = {
  title: 'Networking',
  questionCount: 4,
  difficulty: 'EASY',
  questionTypes: ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'MULTIPLE_SELECT', 'IDENTIFICATION'],
  defaultMode: 'PRACTICE',
  includeExplanations: true,
};
test('P4-T16 validates every difficulty, mode and question type with explicit count boundaries', () => {
  for (const difficulty of ['EASY', 'MEDIUM', 'HARD'])
    for (const defaultMode of ['PRACTICE', 'EXAM'])
      assert.ok(
        quizSettingsSchema.safeParse({ ...settings, difficulty, defaultMode }).success,
      );
  for (const questionCount of [0, 51, 2, 1.5])
    assert.ok(!quizSettingsSchema.safeParse({ ...settings, questionCount }).success);
  for (const questionTypes of [[], ['UNKNOWN'], ['TRUE_FALSE', 'TRUE_FALSE']])
    assert.ok(!quizSettingsSchema.safeParse({ ...settings, questionTypes }).success);
  assert.ok(!quizSettingsSchema.safeParse({ ...settings, ownerId: 'forged' }).success);
});
