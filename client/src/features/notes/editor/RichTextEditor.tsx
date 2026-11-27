import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { noteExtensions } from './extensions';
import { noteContentSchema } from '@/types/note-content';
import type { RichDocument } from '@/types/note';

interface RichTextEditorProps {
  content: RichDocument;
  disabled: boolean;
  onChange: (content: RichDocument) => void;
}

export function RichTextEditor({ content, disabled, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: noteExtensions(),
    content,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': 'Note content',
        'aria-multiline': 'true',
        class: 'min-h-72 rounded-b-lg bg-white p-5 outline-none',
      },
    },
    onUpdate: ({ editor: current }) =>
      onChange(noteContentSchema.parse(current.getJSON())),
  });
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);
  useEffect(() => {
    if (editor && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [editor, content]);
  if (!editor) return <p role="status">Loading editor…</p>;
  const controls = [
    {
      label: 'Paragraph',
      active: editor.isActive('paragraph'),
      run: () => editor.chain().focus().setParagraph().run(),
    },
    {
      label: 'Heading 1',
      active: editor.isActive('heading', { level: 1 }),
      run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: 'Heading 2',
      active: editor.isActive('heading', { level: 2 }),
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: 'Heading 3',
      active: editor.isActive('heading', { level: 3 }),
      run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: 'Bold',
      active: editor.isActive('bold'),
      run: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: 'Italic',
      active: editor.isActive('italic'),
      run: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: 'Underline',
      active: editor.isActive('underline'),
      run: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: 'Bullet list',
      active: editor.isActive('bulletList'),
      run: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: 'Numbered list',
      active: editor.isActive('orderedList'),
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: 'Checklist',
      active: editor.isActive('taskList'),
      run: () => editor.chain().focus().toggleTaskList().run(),
    },
    {
      label: 'Code block',
      active: editor.isActive('codeBlock'),
      run: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      label: 'Quote',
      active: editor.isActive('blockquote'),
      run: () => editor.chain().focus().toggleBlockquote().run(),
    },
  ];
  return (
    <div className="rounded-lg border border-slate-300 [&_h1]:text-3xl [&_h2]:text-2xl [&_h3]:text-xl [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_p]:my-3 [&_ul]:ml-5 [&_ul]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal [&_pre]:overflow-auto [&_pre]:rounded [&_pre]:bg-slate-100 [&_pre]:p-4 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_ul[data-type=taskList]]:list-none [&_li[data-type=taskItem]]:flex [&_li[data-type=taskItem]]:gap-3">
      <div
        role="toolbar"
        aria-label="Text formatting"
        className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2"
      >
        {controls.map((control) => (
          <button
            key={control.label}
            type="button"
            disabled={disabled}
            className="rounded px-2 py-1 text-sm hover:bg-slate-200 aria-pressed:bg-teal-100 disabled:opacity-40"
            aria-pressed={control.active}
            onClick={control.run}
          >
            {control.label}
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
