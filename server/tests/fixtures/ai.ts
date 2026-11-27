import type { QuizSettings } from '../../src/utils/input-validators/quizzes.ts';
import type { QuizDraft } from '../../src/ai/schemas/quiz.ts';
export function validQuiz(settings: QuizSettings, keys: string[]): QuizDraft {
  return {
    title: settings.title,
    questions: Array.from({ length: settings.questionCount }, (_, index) => {
      const type = settings.questionTypes[index % settings.questionTypes.length]!;
      const base = {
        prompt: 'Protocol concept ' + (index + 1),
        explanation: settings.includeExplanations ? 'Grounded explanation' : null,
        sourceKeys: [keys[index % keys.length]!],
      };
      if (type === 'IDENTIFICATION') return { ...base, type, acceptedAnswers: ['tcp'] };
      return {
        ...base,
        type,
        options:
          type === 'TRUE_FALSE'
            ? [
                { id: 'a', text: 'True' },
                { id: 'b', text: 'False' },
              ]
            : [
                { id: 'a', text: 'TCP' },
                { id: 'b', text: 'UDP' },
                { id: 'c', text: 'IP' },
              ],
        correctOptionIds: type === 'MULTIPLE_SELECT' ? ['a', 'b'] : ['a'],
      };
    }),
  };
}
