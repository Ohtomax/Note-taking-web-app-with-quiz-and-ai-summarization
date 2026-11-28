import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import SummaryReader from '@/features/summaries/SummaryReader';

it('renders study Markdown, formulas and code with an accessible contents list and blocks raw HTML', () => {
  const { container } = render(
    <SummaryReader
      content={{
        title: 'Study guide',
        sections: [
          { heading: 'Overview', text: '**Key concept**: $x^2$', sourceKeys: [] },
          {
            heading: 'Examples',
            text: '~~~js\nconst example = 2;\n~~~\n\n|Term|Value|\n|---|---|\n|Example|2|',
            sourceKeys: [],
          },
          {
            heading: 'Recap',
            text: '<iframe src="https://example.test"></iframe>\n\n![Remote](https://example.test/image.png)',
            sourceKeys: [],
          },
        ],
      }}
      sources={[]}
    />,
  );
  expect(screen.getByText('Key concept').tagName).toBe('STRONG');
  expect(container.querySelector('.katex')).toBeInTheDocument();
  expect(container.querySelector('.hljs-keyword')).toHaveTextContent('const');
  expect(screen.getByRole('table')).toBeInTheDocument();
  expect(container.querySelector('iframe, img')).toBeNull();

  const overview = screen.getByRole('heading', { name: 'Overview' }).closest('details')!;
  fireEvent.click(overview.querySelector('summary')!);
  expect(overview.open).toBe(false);
  fireEvent.click(screen.getByRole('link', { name: 'Overview' }));
  expect(overview.open).toBe(true);
});
