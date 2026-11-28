import { Link } from 'react-router-dom';
import type { z } from 'zod';
import type { sourceMetadataSchema } from '@/types/study';

type Source = Pick<
  z.infer<typeof sourceMetadataSchema>,
  'sourceKey' | 'noteId' | 'noteTitle'
>;

export function SourceLink({ source, projectId }: { source: Source; projectId: string }) {
  const summaryId = /^summary:([0-9a-f-]{36})$/i.exec(source.sourceKey)?.[1];
  const to = summaryId
    ? '/summaries/' + summaryId
    : source.noteId
      ? '/projects/' + projectId + '/notes/' + source.noteId
      : null;
  return to ? (
    <Link className="font-medium text-brand-text underline underline-offset-2" to={to}>
      {source.noteTitle}
    </Link>
  ) : (
    <span>{source.noteTitle}</span>
  );
}
