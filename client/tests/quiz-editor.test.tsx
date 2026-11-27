import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QuizEditor } from '@/features/quizzes/QuizEditor';
import type { QuizDraft } from '@/types/quiz';
import type { QuizSettings } from '@/types/quiz-settings';
it('identifies invalid question keys and submits edited choices through a validated draft', () => {
  const settings: QuizSettings = {
    title: 'Protocols',
    questionCount: 1,
    difficulty: 'EASY',
    questionTypes: ['MULTIPLE_CHOICE'],
    defaultMode: 'EXAM',
    includeExplanations: false,
  };
  const content: QuizDraft = {
    title: 'Protocols',
    questions: [
      {
        type: 'MULTIPLE_CHOICE',
        prompt: 'Pick transport',
        explanation: null,
        sourceKeys: ['note:a'],
        options: [
          { id: 'a', text: 'TCP' },
          { id: 'b', text: 'UDP' },
        ],
        correctOptionIds: [],
      },
    ],
  };
  const save = vi.fn();
  render(
    <QuizEditor
      initial={{ settings, content }}
      sourceKeys={['note:a']}
      onSave={save}
      busy={false}
      error={null}
    />,
  );
  expect(
    screen
      .getAllByRole('alert')
      .some((item) => item.textContent?.includes('Question 1:')),
  ).toBe(true);
  expect(screen.getByRole('button', { name: 'Save quiz' })).toBeDisabled();
  fireEvent.click(screen.getByLabelText('Question 1 correct option 2'));
  fireEvent.change(screen.getByLabelText('Question 1 prompt'), {
    target: { value: 'Edited prompt' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save quiz' }));
  expect(save).toHaveBeenCalledWith(
    settings,
    expect.objectContaining({
      questions: [
        expect.objectContaining({ prompt: 'Edited prompt', correctOptionIds: ['b'] }),
      ],
    }),
  );
});
