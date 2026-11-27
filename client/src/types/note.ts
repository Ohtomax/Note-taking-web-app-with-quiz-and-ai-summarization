import type { RichDocument } from './note-content';
export type { RichDocument, RichNode } from './note-content';

export interface NoteDraft {
  title: string;
  content: RichDocument;
  revision: number;
}
