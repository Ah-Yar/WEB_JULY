import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export default function RichNoteEditor({ value, onChange, placeholder = 'Write your note…' }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '',
    editorProps: { attributes: { class: 'rich-editor__content', 'data-placeholder': placeholder } },
    onUpdate: ({ editor: current }) => onChange(current.getHTML())
  });

  useEffect(() => {
    if (editor && value !== undefined && editor.getHTML() !== (value || '<p></p>')) editor.commands.setContent(value || '', false);
  }, [editor, value]);
  useEffect(() => () => editor?.destroy(), [editor]);
  if (!editor) return <div className="rich-editor rich-editor--loading">Preparing editor…</div>;

  const control = (label, action, active = false) => <button type="button" className={active ? 'is-active' : ''} onClick={action} aria-label={label}>{label}</button>;
  return <div className="rich-editor">
    <div className="rich-editor__toolbar">
      {control('B', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
      {control('I', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}
      {control('•', () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'))}
      {control('1.', () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'))}
      {control('↶', () => editor.chain().focus().undo().run())}
      {control('↷', () => editor.chain().focus().redo().run())}
    </div>
    <EditorContent editor={editor} />
  </div>;
}
