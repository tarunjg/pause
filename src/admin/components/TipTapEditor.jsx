import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect } from 'react';

export default function TipTapEditor({ content, onUpdate, onImageUpload }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: 'Start writing your newsletter...' }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getHTML());
    },
    editorProps: {
      handleDrop(view, event) {
        const files = event.dataTransfer?.files;
        if (files?.length && files[0].type.startsWith('image/')) {
          event.preventDefault();
          onImageUpload?.(files[0], (url) => {
            editor.chain().focus().setImage({ src: url }).run();
          });
          return true;
        }
        return false;
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              onImageUpload?.(file, (url) => {
                editor.chain().focus().setImage({ src: url }).run();
              });
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  // Sync external content changes (e.g., AI draft populating)
  useEffect(() => {
    if (editor && content !== undefined && content !== editor.getHTML()) {
      editor.commands.setContent(content || '', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, editor]);

  const addImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files[0];
      if (file) {
        onImageUpload?.(file, (url) => {
          editor.chain().focus().setImage({ src: url }).run();
        });
      }
    };
    input.click();
  }, [editor, onImageUpload]);

  if (!editor) return null;

  return (
    <div style={styles.wrapper}>
      <div style={styles.toolbar}>
        <ToolbarButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          label="H2"
        />
        <ToolbarButton
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          label="H3"
        />
        <Divider />
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="B"
          style={{ fontWeight: 700 }}
        />
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="I"
          style={{ fontStyle: 'italic' }}
        />
        <Divider />
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="List"
        />
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="1."
        />
        <ToolbarButton
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          label="Quote"
        />
        <Divider />
        <ToolbarButton onClick={addImage} label="Image" />
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          label="HR"
        />
        <ToolbarButton
          onClick={() => {
            const url = window.prompt('URL:');
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          label="Link"
        />
        {editor.isActive('link') && (
          <ToolbarButton
            onClick={() => editor.chain().focus().unsetLink().run()}
            label="Unlink"
          />
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({ active, onClick, label, style: extraStyle }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.toolbarBtn,
        ...(active ? styles.toolbarBtnActive : {}),
        ...extraStyle,
      }}
      type="button"
    >
      {label}
    </button>
  );
}

function Divider() {
  return <span style={styles.divider} />;
}

const styles = {
  wrapper: {
    border: '1px solid #2a2520', borderRadius: 8, overflow: 'hidden',
    background: '#1a1816',
  },
  toolbar: {
    display: 'flex', alignItems: 'center', gap: 2, padding: '8px 12px',
    borderBottom: '1px solid #2a2520', background: '#1e1c19', flexWrap: 'wrap',
  },
  toolbarBtn: {
    background: 'transparent', border: '1px solid transparent', color: '#a89d91',
    padding: '4px 10px', fontSize: 13, borderRadius: 4, cursor: 'pointer',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  toolbarBtnActive: { background: '#2a2520', color: '#fff', borderColor: '#3a3530' },
  divider: {
    width: 1, height: 20, background: '#2a2520', margin: '0 4px',
  },
};
