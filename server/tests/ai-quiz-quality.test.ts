
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validQuiz } from './fixtures/ai.ts';
import { quizResultSchema } from '../src/ai/schemas/quiz.ts';
import { quizSettingsSchema } from '../src/utils/input-validators/quizzes.ts';
test('P4-T20 valid mixed quiz retains all types and explanation rules while rejecting repetitions',()=>{
 const settings=quizSettingsSchema.parse({title:'Mixed',questionCount:4,difficulty:'HARD',questionTypes:['MULTIPLE_CHOICE','TRUE_FALSE','MULTIPLE_SELECT','IDENTIFICATION'],defaultMode:'PRACTICE',includeExplanations:true});
 const draft=validQuiz(settings,['note:a']),schema=quizResultSchema(settings,['note:a']);
 assert.ok(schema.safeParse(draft).success);
 assert.ok(!schema.safeParse({...draft,questions:draft.questions.map(q=>({...q,prompt:'Repeated?'}))}).success);
 assert.ok(!schema.safeParse({...draft,questions:draft.questions.map(q=>({...q,explanation:null}))}).success);
 assert.ok(!schema.safeParse({...draft,questions:draft.questions.slice(1)}).success);
});
