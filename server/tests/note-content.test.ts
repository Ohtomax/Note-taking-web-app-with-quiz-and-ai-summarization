import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyDocument,
  noteContentSchema,
  extractPlainText,
} from '../src/utils/input-validators/note-content.ts';

test('rich text round trips all supported block and inline formats', () => {
  const paragraph = {
    type: 'paragraph',
    content: [
      {
        type: 'text',
        text: 'OSI',
        marks: [{ type: 'bold' }, { type: 'italic' }, { type: 'underline' }],
      },
    ],
  };
  const content = {
    type: 'doc',
    content: [
      paragraph,
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Layers' }],
      },
      { type: 'bulletList', content: [{ type: 'listItem', content: [paragraph] }] },
      {
        type: 'orderedList',
        attrs: { start: 1 },
        content: [{ type: 'listItem', content: [paragraph] }],
      },
      {
        type: 'taskList',
        content: [{ type: 'taskItem', attrs: { checked: true }, content: [paragraph] }],
      },
      { type: 'blockquote', content: [paragraph] },
      {
        type: 'codeBlock',
        attrs: { language: null },
        content: [{ type: 'text', text: 'ping' }],
      },
    ],
  };
  assert.deepEqual(noteContentSchema.parse(JSON.parse(JSON.stringify(content))), content);
  assert.match(extractPlainText(noteContentSchema.parse(content)), /\[x\] OSI/);
  assert.deepEqual(noteContentSchema.parse(emptyDocument), emptyDocument);
});

test('rich text rejects executable attributes, unsupported nodes, bad structure and excess depth', () => {
  for (const content of [
    { type: 'doc', content: [{ type: 'script' }] },
    { type: 'doc', content: [{ type: 'paragraph', attrs: { onclick: 'bad()' } }] },
    { type: 'doc', content: [{ type: 'text', text: 'bad parent' }] },
    {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'x',
              marks: [{ type: 'link', attrs: { href: 'javascript:bad' } }],
            },
          ],
        },
      ],
    },
    {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'x'.repeat(180001) }] },
      ],
    },
    {
      type: 'doc',
      content: [
        Array.from({ length: 14 }).reduce(
          (value) => ({ type: 'blockquote', content: [value] }),
          { type: 'paragraph' } as unknown,
        ),
      ],
    },
  ])
    assert.equal(noteContentSchema.safeParse(content).success, false);
});
