import type { PlayerAttempt, PlayerQuestion } from '@/types/attempts';
export const fixtureId = (n: number) =>
  '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
export function attemptFixture(mode: PlayerAttempt['mode'] = 'EXAM'): PlayerAttempt {
  const questions: PlayerQuestion[] = [
    {
      id: fixtureId(10),
      position: 1,
      type: 'MULTIPLE_CHOICE',
      prompt: 'Choose the transport protocol',
      options: [
        { id: fixtureId(20), text: 'TCP' },
        { id: fixtureId(21), text: 'IP' },
      ],
      sourceKeys: ['source'],
    },
    {
      id: fixtureId(11),
      position: 2,
      type: 'TRUE_FALSE',
      prompt: 'TCP is a transport protocol',
      options: [
        { id: fixtureId(22), text: 'True' },
        { id: fixtureId(23), text: 'False' },
      ],
      sourceKeys: ['source'],
    },
    {
      id: fixtureId(12),
      position: 3,
      type: 'MULTIPLE_SELECT',
      prompt: 'Select transport protocols',
      options: [
        { id: fixtureId(24), text: 'TCP' },
        { id: fixtureId(25), text: 'UDP' },
        { id: fixtureId(26), text: 'IP' },
      ],
      sourceKeys: ['source'],
    },
    {
      id: fixtureId(13),
      position: 4,
      type: 'IDENTIFICATION',
      prompt: 'Name the reliable protocol',
      options: [],
      sourceKeys: ['source'],
    },
  ];
  return {
    id: fixtureId(1),
    quizId: fixtureId(2),
    projectId: fixtureId(3),
    versionId: fixtureId(4),
    quizTitle: 'Mixed study',
    version: 1,
    difficulty: 'MEDIUM',
    mode,
    status: 'IN_PROGRESS',
    startedAt: '2026-01-01T00:00:00.000Z',
    finishedAt: null,
    totalQuestions: 4,
    lastQuestionIndex: 1,
    questionOrder: questions.map((question) => question.id),
    optionOrder: Object.fromEntries(
      questions.map((question) => [
        question.id,
        question.options.map((option) => option.id),
      ]),
    ),
    questions,
    answers: [],
    sources: [
      {
        sourceKey: 'source',
        noteId: null,
        noteTitle: 'Study notes',
        revision: 1,
        contentHash: 'hash',
        rangeStart: null,
        rangeEnd: null,
      },
    ],
  };
}
