import type { SummaryContent } from '@/types/study';

export function SummaryFields({
  content,
  onChange,
}: {
  content: SummaryContent;
  onChange: (value: SummaryContent) => void;
}) {
  return (
    <div className="grid gap-4">
      <label className="grid gap-1 text-sm font-medium">
        Summary title
        <input
          className="field"
          maxLength={200}
          required
          value={content.title}
          onChange={(e) => onChange({ ...content, title: e.target.value })}
        />
      </label>
      {content.sections.map((section, index) => {
        const edit = (changes: Partial<typeof section>) =>
          onChange({
            ...content,
            sections: content.sections.map((item, i) =>
              i === index ? { ...item, ...changes } : item,
            ),
          });
        return (
          <fieldset key={index} className="grid gap-3 rounded-xl border border-edge p-3">
            <legend className="px-1 text-sm font-semibold">Section {index + 1}</legend>
            <label className="grid gap-1 text-sm">
              Section {index + 1} heading
              <input
                className="field"
                maxLength={200}
                value={section.heading ?? ''}
                onChange={(e) => edit({ heading: e.target.value || null })}
              />
            </label>
            <label className="grid gap-1 text-sm">
              Section {index + 1} text
              <textarea
                className="field min-h-28"
                maxLength={16000}
                required
                value={section.text}
                onChange={(e) => edit({ text: e.target.value })}
              />
            </label>
          </fieldset>
        );
      })}
    </div>
  );
}
