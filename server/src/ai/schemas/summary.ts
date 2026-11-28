import {
  summaryContentSchema,
  type SummarySettings,
} from '@/utils/input-validators/summaries.js';
export const summaryResultSchema = (settings: SummarySettings, sourceKeys: string[]) =>
  summaryContentSchema.superRefine((value, context) => {
    const length = value.sections.reduce((sum, section) => sum + section.text.length, 0);
    const bounds = {
      SHORT: { text: 2000, sections: 5 },
      MEDIUM: { text: 6000, sections: 12 },
      DETAILED: { text: 16000, sections: 24 },
    }[settings.length];
    if (length > bounds.text || value.sections.length > bounds.sections)
      context.addIssue({ code: 'custom', message: 'Summary exceeds requested length' });
    for (const section of value.sections) {
      if (
        section.sourceKeys.some((key) => !sourceKeys.includes(key)) ||
        new Set(section.sourceKeys).size !== section.sourceKeys.length
      )
        context.addIssue({ code: 'custom', message: 'Summary cites an invalid source' });
      if (
        ['KEY_CONCEPTS', 'STUDY_GUIDE', 'EXAM_REVIEWER'].includes(settings.format) &&
        !section.heading
      )
        context.addIssue({
          code: 'custom',
          message: 'This format requires section headings',
        });
    }
  });
