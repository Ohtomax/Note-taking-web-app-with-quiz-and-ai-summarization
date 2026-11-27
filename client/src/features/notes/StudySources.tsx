import { useState } from 'react';
import { SourcePicker, type SourcePickerProps } from './SourcePicker';
import type { SourceChoice } from '@/types/study-sources';
export function StudySources(props: Omit<SourcePickerProps, 'onChange'>) {
  const [choice, setChoice] = useState<SourceChoice | null>(null);
  return (
    <details className="my-5">
      <summary className="cursor-pointer font-medium text-teal-800">
        Choose study sources
      </summary>
      <div className="mt-3">
        <SourcePicker {...props} onChange={setChoice} />
        {choice?.projectId === props.projectId && (
          <p className="mt-2 text-xs text-slate-500">
            Source ready for study tools: {choice.description}
          </p>
        )}
      </div>
    </details>
  );
}
