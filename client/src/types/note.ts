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

export interface NoteDraft {
  title: string;
  content: RichDocument;
  revision: number;
}
