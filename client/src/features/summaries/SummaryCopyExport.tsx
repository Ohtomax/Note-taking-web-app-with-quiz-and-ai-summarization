import { useState } from 'react';
import { Copy, Download } from 'lucide-react';
import type { SummaryContent } from '@/types/study';
export function SummaryCopyExport({ content }: { content: SummaryContent }) {
  const [status, setStatus] = useState('');
  const markdown = () =>
    '# ' +
    content.title +
    '\n\n' +
    content.sections
      .map(
        (section) =>
          (section.heading ? '## ' + section.heading + '\n\n' : '') + section.text,
      )
      .join('\n\n') +
    '\n';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown());
      setStatus('Summary copied.');
    } catch {
      setStatus('Clipboard unavailable. You can download the Markdown file.');
    }
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([markdown()], { type: 'text/markdown;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download =
      (content.title
        .replace(/[^\p{L}\p{N} -]/gu, '')
        .trim()
        .slice(0, 100) || 'study-summary') + '.md';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Summary exported as Markdown.');
  };
  return (
    <>
      <button type="button" className="action" onClick={() => void copy()}>
        <Copy size={16} aria-hidden="true" />
        Copy summary
      </button>
      <button type="button" className="action" onClick={download}>
        <Download size={16} aria-hidden="true" />
        Export Markdown
      </button>
      {status && (
        <span className="self-center text-sm text-muted" role="status">
          {status}
        </span>
      )}
    </>
  );
}
