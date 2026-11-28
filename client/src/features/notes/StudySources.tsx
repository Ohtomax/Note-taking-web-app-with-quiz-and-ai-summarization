import { useState } from 'react';
import { SourcePicker, type SourcePickerProps } from './SourcePicker';
import type { SourceChoice } from '@/types/study-sources';
import { SummaryGenerator } from '@/features/summaries/SummaryGenerator';
import { QuizGenerator } from '@/features/quizzes/QuizGenerator';
export function StudySources(props: Omit<SourcePickerProps, 'onChange'>) {
  const [choice, setChoice] = useState<SourceChoice | null>(null);
  return (
    <details className="surface my-5 p-4 sm:p-5">
      <summary className="cursor-pointer font-semibold text-brand-text">
        Choose study sources
      </summary>
      <div className="mt-4 grid gap-4">
        <SourcePicker {...props} onChange={setChoice} />
        <SummaryGenerator projectId={props.projectId} choice={choice} linkSaved />
        <QuizGenerator projectId={props.projectId} choice={choice} />
        {choice?.projectId === props.projectId && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Source ready for study tools: {choice.description}
          </p>
        )}
      </div>
    </details>
  );
}
