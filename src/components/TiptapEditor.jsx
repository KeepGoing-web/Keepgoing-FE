import { useEffect, useCallback, useState, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import { common, createLowlight } from 'lowlight'
import { Markdown } from 'tiptap-markdown'
import MermaidPreview from '../extensions/MermaidPreview'
import '../styles/hljs-theme.css'
import '../extensions/MermaidPreview.css'
import './TiptapEditor.css'

const lowlight = createLowlight(common)

/* ── SVG icon helpers ────────────────────────────────────────── */
const Icon = ({ d, size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
)

/* ── Color palette (Catppuccin Mocha friendly) ───────────────── */
const COLOR_PALETTE = [
  { color: null,      label: '기본' },
  { color: '#cdd6f4', label: '흰색' },
  { color: '#f38ba8', label: '빨강' },
  { color: '#fab387', label: '주황' },
  { color: '#f9e2af', label: '노랑' },
  { color: '#a6e3a1', label: '초록' },
  { color: '#89dceb', label: '하늘' },
  { color: '#89b4fa', label: '파랑' },
  { color: '#cba6f7', label: '보라' },
  { color: '#f5c2e7', label: '분홍' },
]

/* ── Color picker dropdown ───────────────────────────────────── */
const ColorPicker = ({ editor }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const currentColor = editor.getAttributes('textStyle').color || null

  return (
    <div className="tiptap-color-picker" ref={ref}>
      <button
        type="button"
        className={`tiptap-toolbar-btn${currentColor ? ' is-active' : ''}`}
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v) }}
        title="텍스트 색상"
        aria-label="텍스트 색상"
        aria-expanded={open}
      >
        <span className="tiptap-color-icon" style={{ borderBottomColor: currentColor || 'var(--text-muted)' }}>A</span>
      </button>
      {open && (
        <div className="tiptap-color-dropdown" role="listbox" aria-label="색상 선택">
          {COLOR_PALETTE.map(({ color, label }) => (
            <button
              key={label}
              type="button"
              className={`tiptap-color-swatch${(currentColor === color || (!currentColor && !color)) ? ' is-active' : ''}`}
              style={{ background: color || 'var(--text-secondary)' }}
              title={label}
              aria-label={label}
              role="option"
              aria-selected={currentColor === color || (!currentColor && !color)}
              onMouseDown={(e) => {
                e.preventDefault()
                if (color) {
                  editor.chain().focus().setColor(color).run()
                } else {
                  editor.chain().focus().unsetColor().run()
                }
                setOpen(false)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Toolbar button ──────────────────────────────────────────── */
const ToolbarBtn = ({ onClick, active, title, children, wide }) => (
  <button
    type="button"
    className={`tiptap-toolbar-btn${active ? ' is-active' : ''}${wide ? ' is-wide' : ''}`}
    onMouseDown={(e) => {
      e.preventDefault()
      onClick()
    }}
    title={title}
    aria-label={title}
    aria-pressed={active}
  >
    {children}
  </button>
)

/* ── Main component ──────────────────────────────────────────── */
const TiptapEditor = ({ value = '', onChange, placeholder = '내용을 입력하세요...' }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
      TextStyle,
      Color,
      Markdown.configure({ html: true, tightLists: true }),
      MermaidPreview,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const md = editor.storage.markdown.getMarkdown()
      onChange(md)
    },
    editorProps: {
      attributes: {
        class: 'tiptap-prosemirror markdown-body',
        spellcheck: 'false',
      },
    },
  })

  /* Sync external value changes (e.g. loading existing post) */
  useEffect(() => {
    if (!editor) return
    const current = editor.storage.markdown.getMarkdown()
    if (value !== current) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  /* Destroy on unmount */
  useEffect(() => {
    return () => {
      editor?.destroy()
    }
  }, [editor])

  const setLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href || ''
    const url = window.prompt('링크 URL을 입력하세요:', prev)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }, [editor])

  const setImage = useCallback(() => {
    if (!editor) return
    const url = window.prompt('이미지 URL을 입력하세요:')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  if (!editor) return null

  return (
    <div className="tiptap-editor">
      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="tiptap-toolbar" role="toolbar" aria-label="에디터 툴바">

        {/* Group 1: Text formatting */}
        <div className="tiptap-toolbar-group">
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <strong style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem' }}>B</strong>
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            <em style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem' }}>I</em>
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="Strikethrough"
          >
            <s style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem' }}>S</s>
          </ToolbarBtn>
        </div>

        {/* Group 2: Headings */}
        <div className="tiptap-toolbar-group">
          {[1, 2, 3].map((level) => (
            <ToolbarBtn
              key={level}
              onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
              active={editor.isActive('heading', { level })}
              title={`Heading ${level}`}
            >
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', fontWeight: 700 }}>H{level}</span>
            </ToolbarBtn>
          ))}
        </div>

        {/* Group 3: Lists */}
        <div className="tiptap-toolbar-group">
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet list"
          >
            <Icon d="M9 6h11M9 12h11M9 18h11M5 6v.01M5 12v.01M5 18v.01" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Numbered list"
          >
            <Icon d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 9h2M3 15h2a1 1 0 0 1 0 2H3l2 2H3" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            active={editor.isActive('taskList')}
            title="Task list"
          >
            <Icon d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </ToolbarBtn>
        </div>

        {/* Group 4: Code */}
        <div className="tiptap-toolbar-group">
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            title="Inline code"
          >
            <Icon d="M10 20l4-16M18 20l4-4-4-4M6 20l-4-4 4-4" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            title="Code block"
            wide
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '-0.03em' }}>```</span>
          </ToolbarBtn>
        </div>

        {/* Group 5: Mermaid Diagram */}
        <div className="tiptap-toolbar-group">
          <ToolbarBtn
            onClick={() => {
              editor.chain().focus().insertContent({
                type: 'codeBlock',
                attrs: { language: 'mermaid' },
                content: [{ type: 'text', text: 'graph TD\n    A[시작] --> B{조건}\n    B -->|Yes| C[결과 1]\n    B -->|No| D[결과 2]' }],
              }).run()
            }}
            active={editor.isActive('codeBlock', { language: 'mermaid' })}
            title="Mermaid Diagram"
          >
            <Icon d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" size={14} />
          </ToolbarBtn>
        </div>

        {/* Group 6: Color */}
        <div className="tiptap-toolbar-group">
          <ColorPicker editor={editor} />
        </div>

        {/* Group 6: Insert */}
        <div className="tiptap-toolbar-group">
          <ToolbarBtn
            onClick={setLink}
            active={editor.isActive('link')}
            title="Link (Ctrl+K)"
          >
            <Icon d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={setImage}
            active={false}
            title="Image"
          >
            <Icon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" size={13} />
          </ToolbarBtn>
        </div>

        {/* Group 6: Block */}
        <div className="tiptap-toolbar-group">
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title="Blockquote"
          >
            <Icon d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" size={13} />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            active={false}
            title="Horizontal rule"
          >
            <Icon d="M5 12h14" />
          </ToolbarBtn>
        </div>
      </div>

      {/* ── Editor area ─────────────────────────────────── */}
      <div className="tiptap-content-area">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default TiptapEditor
