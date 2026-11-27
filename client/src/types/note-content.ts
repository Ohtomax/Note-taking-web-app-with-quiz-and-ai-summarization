import { z } from 'zod';

export interface RichNode {
  type: string;
  text?: string;
  attrs?: Record<string, string | number | boolean | null>;
  marks?: { type: string }[];
  content?: RichNode[];
}
export interface RichDocument extends RichNode {
  type: 'doc';
  content: RichNode[];
}
export const emptyDocument: RichDocument = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};
const blocks = [
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'taskList',
  'codeBlock',
  'blockquote',
  'horizontalRule',
];
const children: Record<string, string[]> = {
  doc: blocks,
  paragraph: ['text', 'hardBreak'],
  heading: ['text', 'hardBreak'],
  bulletList: ['listItem'],
  orderedList: ['listItem'],
  taskList: ['taskItem'],
  listItem: blocks,
  taskItem: blocks,
  blockquote: blocks,
  codeBlock: ['text'],
  text: [],
  hardBreak: [],
  horizontalRule: [],
};

// Check structure iteratively before using the document. This also bounds hostile depth.
export function isRichDocument(value: unknown): value is RichDocument {
  if (!value || typeof value !== 'object' || JSON.stringify(value).length > 180000)
    return false;
  const pending: { node: unknown; depth: number; allowed: string[] }[] = [
    { node: value, depth: 0, allowed: ['doc'] },
  ];
  let count = 0;
  while (pending.length) {
    const item = pending.pop()!;
    const node = item.node as RichNode;
    if (
      ++count > 10000 ||
      item.depth > 12 ||
      !node ||
      typeof node !== 'object' ||
      Array.isArray(node) ||
      !item.allowed.includes(node.type)
    )
      return false;
    if (
      Object.keys(node).some(
        (key) => !['type', 'text', 'attrs', 'marks', 'content'].includes(key),
      )
    )
      return false;
    if (node.type === 'text') {
      if (
        typeof node.text !== 'string' ||
        !node.text.length ||
        node.content ||
        node.attrs
      )
        return false;
    } else if (node.text !== undefined) return false;
    if (
      node.marks !== undefined &&
      (node.type !== 'text' ||
        !Array.isArray(node.marks) ||
        node.marks.length > 4 ||
        node.marks.some(
          (mark) =>
            !mark ||
            Object.keys(mark).length !== 1 ||
            !['bold', 'italic', 'underline', 'strike', 'code'].includes(mark.type),
        ))
    )
      return false;
    if (node.attrs !== undefined) {
      if (!node.attrs || typeof node.attrs !== 'object' || Array.isArray(node.attrs))
        return false;
      const keys = Object.keys(node.attrs);
      if (node.type === 'heading') {
        if (
          keys.some((key) => key !== 'level') ||
          ![1, 2, 3].includes(Number(node.attrs.level))
        )
          return false;
      } else if (node.type === 'orderedList') {
        if (
          keys.some((key) => key !== 'start') ||
          !Number.isInteger(node.attrs.start) ||
          Number(node.attrs.start) < 1 ||
          Number(node.attrs.start) > 10000
        )
          return false;
      } else if (node.type === 'taskItem') {
        if (
          keys.some((key) => key !== 'checked') ||
          typeof node.attrs.checked !== 'boolean'
        )
          return false;
      } else if (node.type === 'codeBlock') {
        if (
          keys.some((key) => key !== 'language') ||
          !(
            node.attrs.language === null ||
            (typeof node.attrs.language === 'string' &&
              /^[a-z0-9+-]{0,30}$/i.test(node.attrs.language))
          )
        )
          return false;
      } else if (keys.length) return false;
    }
    if (node.type === 'heading' && !node.attrs) return false;
    if (node.type === 'taskItem' && !node.attrs) return false;
    if (
      node.content !== undefined &&
      (!Array.isArray(node.content) || !children[node.type]?.length)
    )
      return false;
    if (
      [
        'doc',
        'bulletList',
        'orderedList',
        'taskList',
        'listItem',
        'taskItem',
        'blockquote',
      ].includes(node.type) &&
      !node.content?.length
    )
      return false;
    if (
      ['listItem', 'taskItem'].includes(node.type) &&
      node.content?.[0]?.type !== 'paragraph'
    )
      return false;
    for (const child of node.content ?? [])
      pending.push({
        node: child,
        depth: item.depth + 1,
        allowed: children[node.type] ?? [],
      });
  }
  return true;
}

export const noteContentSchema = z.custom<RichDocument>(
  isRichDocument,
  'Invalid rich-text document',
);

export function extractPlainText(node: RichNode): string {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak' || node.type === 'horizontalRule') return '\n';
  const text = (node.content ?? []).map(extractPlainText).join('');
  const checkbox =
    node.type === 'taskItem' ? (node.attrs?.checked ? '[x] ' : '[ ] ') : '';
  return (
    checkbox +
    text +
    (['paragraph', 'heading', 'codeBlock'].includes(node.type) ? '\n' : '')
  );
}
