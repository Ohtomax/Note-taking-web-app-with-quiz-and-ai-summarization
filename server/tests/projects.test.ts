import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProjectSchema } from '../src/utils/input-validators/projects.ts';

test('project creation allows display fields and rejects forged ownership', () => {
  assert.equal(createProjectSchema.parse({ title: ' Networking ' }).title, 'Networking');
  for (const input of [
    { title: '' },
    { title: 'Notes', ownerId: 'forged' },
    { title: 'Notes', color: 'unsafe' },
  ]) {
    assert.equal(createProjectSchema.safeParse(input).success, false);
  }
});
