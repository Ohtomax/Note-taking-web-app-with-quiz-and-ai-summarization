import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarySettingsSchema } from '../src/utils/input-validators/summaries.ts';
import { summaryResultSchema } from '../src/ai/schemas/summary.ts';
test('P4-T11 all summary lengths/formats validate and invented citations or oversized output fail', () => {
  for (const length of ['SHORT', 'MEDIUM', 'DETAILED'] as const)
    for (const format of [
      'PARAGRAPHS',
      'BULLETS',
      'KEY_CONCEPTS',
      'STUDY_GUIDE',
    ] as const) {
      const settings = summarySettingsSchema.parse({ length, format }),
        schema = summaryResultSchema(settings, ['note:a']);
      const valid = {
        title: 'Network',
        sections: [
          {
            heading: 'Transport',
            text: 'TCP is a transport protocol.',
            sourceKeys: ['note:a'],
          },
        ],
      };
      assert.ok(schema.safeParse(valid).success);
      assert.ok(
        !schema.safeParse({
          ...valid,
          sections: [{ ...valid.sections[0], sourceKeys: ['invented'] }],
        }).success,
      );
      assert.ok(
        !schema.safeParse({
          ...valid,
          sections: [{ ...valid.sections[0], text: 'x'.repeat(16001) }],
        }).success,
      );
    }
  assert.ok(
    !summarySettingsSchema.safeParse({ length: 'SHORT', format: 'unknown' }).success,
  );
  assert.ok(
    !summaryResultSchema({ length: 'SHORT', format: 'PARAGRAPHS' }, ['note:a']).safeParse(
      { title: 'Empty', sections: [] },
    ).success,
  );
});
