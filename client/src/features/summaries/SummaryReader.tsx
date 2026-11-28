import { useId } from 'react';
import { BookOpen, ChevronDown, Clock3 } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';
import './summary-reader.css';
import { SourceLink } from '@/features/notes/SourceLink';
import type { z } from 'zod';
import type { sourceMetadataSchema, SummaryContent } from '@/types/study';

const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins: NonNullable<React.ComponentProps<typeof Markdown>['rehypePlugins']> =
  [[rehypeKatex, { trust: false, maxExpand: 100, maxSize: 12 }], rehypeHighlight];

export default function SummaryReader({
  content,
  sources,
  projectId,
}: {
  content: SummaryContent;
  sources: z.infer<typeof sourceMetadataSchema>[];
  projectId?: string;
}) {
  const prefix = useId();
  const readingTime = Math.max(
    1,
    Math.ceil(
      content.sections.reduce(
        (sum, section) => sum + section.text.trim().split(/\s+/u).length,
        0,
      ) / 225,
    ),
  );
  const byKey = new Map(sources.map((source) => [source.sourceKey, source]));
  const sections = content.sections.map((section, index) => ({
    ...section,
    label: section.heading || (index === 0 ? 'Overview' : 'Section ' + (index + 1)),
    id: prefix + '-section-' + index,
  }));
  const showContents = sections.length > 2;
  return (
    <div
      className={
        showContents ? 'grid w-full gap-4 lg:grid-cols-[minmax(0,1fr)_12rem]' : 'w-full'
      }
    >
      <article className="summary-reader min-w-0 space-y-3" aria-label="Summary text">
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <Clock3 size={16} aria-hidden="true" />
          {readingTime} min read
        </p>
        {sections.map((section) => (
          <details
            key={section.id}
            className="surface group scroll-mt-6"
            id={section.id}
            open
          >
            <summary className="flex list-none items-center justify-between gap-3 px-4 py-3 font-semibold sm:px-5">
              <h2 className="min-w-0">{section.label}</h2>
              <ChevronDown
                size={17}
                aria-hidden="true"
                className="shrink-0 text-muted transition group-open:rotate-180"
              />
            </summary>
            <div className="border-t border-edge px-4 pb-4 pt-1 sm:px-5 sm:pb-5">
              <div className="study-markdown">
                <Markdown
                  skipHtml
                  disallowedElements={['img']}
                  remarkPlugins={remarkPlugins}
                  rehypePlugins={rehypePlugins}
                  components={{
                    table: ({ children }) => (
                      <div className="overflow-x-auto">
                        <table>{children}</table>
                      </div>
                    ),
                  }}
                >
                  {section.text}
                </Markdown>
              </div>
              <ul
                className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted"
                aria-label="Section sources"
              >
                {section.sourceKeys.map((key) => {
                  const source = byKey.get(key);
                  if (!source) return null;
                  return (
                    <li key={key} className="flex items-center gap-1">
                      <BookOpen size={13} aria-hidden="true" />
                      {projectId ? (
                        <SourceLink source={source} projectId={projectId} />
                      ) : (
                        source.noteTitle
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </details>
        ))}
      </article>
      {showContents && (
        <nav
          className="order-first self-start rounded-xl border border-edge bg-panel p-4 lg:sticky lg:top-4 lg:order-none"
          aria-label="Summary table of contents"
        >
          <p className="mb-2 text-xs font-semibold text-muted">On this page</p>
          <ul className="grid gap-2 text-sm">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  className="font-medium text-brand-text hover:underline"
                  href={'#' + section.id}
                  onClick={() => {
                    const detail = document.getElementById(section.id);
                    if (detail instanceof HTMLDetailsElement) detail.open = true;
                  }}
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
