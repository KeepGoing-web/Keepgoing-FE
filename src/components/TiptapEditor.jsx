import { useEffect, useCallback, useState, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { Markdown } from 'tiptap-markdown'
import MermaidPreview from '../extensions/MermaidPreview'
import '../styles/hljs-theme.css'
import '../extensions/MermaidPreview.css'
import './TiptapEditor.css'

const lowlight = createLowlight(common)

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

const ToolbarBtn = ({ onClick, active, title, children, wide }) => (
  <button
    type="button"
    className={`tiptap-toolbar-btn${active ? ' is-active' : ''}${wide ? ' is-wide' : ''}`}
    onMouseDown={(event) => {
      event.preventDefault()
      onClick()
    }}
    title={title}
    aria-label={title}
    aria-pressed={active}
  >
    {children}
  </button>
)

const SmartActionBtn = ({ onClick, active, label }) => (
  <button
    type="button"
    className={`tiptap-smartbar-btn${active ? ' is-active' : ''}`}
    onMouseDown={(event) => {
      event.preventDefault()
      onClick()
    }}
    aria-pressed={active}
  >
    {label}
  </button>
)

const InsertPopover = ({ label, placeholder, value, onChange, onCancel, onConfirm, confirmLabel }) => (
  <div className="tiptap-insert-popover" role="dialog" aria-label={label}>
    <label className="tiptap-insert-label">
      <span>{label}</span>
      <input
        className="tiptap-insert-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            onConfirm()
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            onCancel()
          }
        }}
        placeholder={placeholder}
        autoFocus
      />
    </label>
    <div className="tiptap-insert-actions">
      <button type="button" className="tiptap-insert-btn" onClick={onCancel}>
        취소
      </button>
      <button type="button" className="tiptap-insert-btn tiptap-insert-btn--primary" onClick={onConfirm}>
        {confirmLabel}
      </button>
    </div>
  </div>
)

const TiptapEditor = ({ value = '', onChange, placeholder = '내용을 입력하세요...' }) => {
  const [insertMenu, setInsertMenu] = useState(null)
  const insertMenuRef = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
      Markdown.configure({ html: true, tightLists: true }),
      MermaidPreview,
    ],
    content: value,
    onUpdate: ({ editor: currentEditor }) => {
      const markdown = currentEditor.storage.markdown.getMarkdown()
      onChange(markdown)
    },
    editorProps: {
      attributes: {
        class: 'tiptap-prosemirror markdown-body',
        spellcheck: 'false',
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    const current = editor.storage.markdown.getMarkdown()
    if (value !== current) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  useEffect(() => {
    return () => {
      editor?.destroy()
    }
  }, [editor])

  useEffect(() => {
    if (!insertMenu) return undefined

    const handleOutsideClick = (event) => {
      if (insertMenuRef.current && !insertMenuRef.current.contains(event.target)) {
        setInsertMenu(null)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [insertMenu])

  const openLinkMenu = useCallback(() => {
    if (!editor) return
    setInsertMenu({
      type: 'link',
      value: editor.getAttributes('link').href || '',
    })
  }, [editor])

  const openImageMenu = useCallback(() => {
    if (!editor) return
    setInsertMenu({
      type: 'image',
      value: '',
    })
  }, [editor])

  const handleInsertConfirm = useCallback(() => {
    if (!editor || !insertMenu) return

    const nextValue = insertMenu.value.trim()

    if (insertMenu.type === 'link') {
      if (!nextValue) {
        editor.chain().focus().extendMarkRange('link').unsetLink().run()
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href: nextValue }).run()
      }
    }

    if (insertMenu.type === 'image' && nextValue) {
      editor.chain().focus().setImage({ src: nextValue }).run()
    }

    setInsertMenu(null)
  }, [editor, insertMenu])

  if (!editor) return null

  return (
    <div className="tiptap-editor">
      <div className="tiptap-smartbar" aria-label="빠른 서식">
        <div className="tiptap-smartbar-copy">
          <strong>마크다운 몰라도 괜찮아요.</strong>
          <span>버튼만 눌러도 실제 포스트에 보이는 제목, 목록, 체크리스트, 링크를 만들 수 있습니다.</span>
        </div>
        <div className="tiptap-smartbar-actions">
          <SmartActionBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} label="섹션 제목" />
          <SmartActionBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} label="목록" />
          <SmartActionBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} label="체크리스트" />
          <SmartActionBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} label="인용" />
          <SmartActionBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} label="코드" />
          <SmartActionBtn onClick={openLinkMenu} active={editor.isActive('link')} label="링크" />
          <SmartActionBtn onClick={openImageMenu} active={false} label="이미지" />
        </div>
      </div>

      <div className="tiptap-toolbar" role="toolbar" aria-label="에디터 툴바">
        <div className="tiptap-toolbar-group">
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="굵게">
            <strong style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem' }}>B</strong>
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="기울임">
            <em style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem' }}>I</em>
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="취소선">
            <s style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem' }}>S</s>
          </ToolbarBtn>
        </div>

        <div className="tiptap-toolbar-group">
          {[1, 2, 3].map((level) => (
            <ToolbarBtn
              key={level}
              onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
              active={editor.isActive('heading', { level })}
              title={`제목 ${level}`}
            >
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', fontWeight: 700 }}>H{level}</span>
            </ToolbarBtn>
          ))}
        </div>

        <div className="tiptap-toolbar-group">
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="글머리 목록">
            <Icon d="M9 6h11M9 12h11M9 18h11M5 6v.01M5 12v.01M5 18v.01" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="번호 목록">
            <Icon d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 9h2M3 15h2a1 1 0 0 1 0 2H3l2 2H3" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="체크리스트">
            <Icon d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </ToolbarBtn>
        </div>

        <div className="tiptap-toolbar-group">
          <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="인라인 코드">
            <Icon d="M10 20l4-16M18 20l4-4-4-4M6 20l-4-4 4-4" />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="코드 블록" wide>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '-0.03em' }}>```</span>
          </ToolbarBtn>
        </div>

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
            title="Mermaid 다이어그램"
          >
            <Icon d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" size={14} />
          </ToolbarBtn>
        </div>

        <div className="tiptap-toolbar-group tiptap-toolbar-group--insert" ref={insertMenuRef}>
          <ToolbarBtn onClick={openLinkMenu} active={editor.isActive('link')} title="링크">
            <Icon d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </ToolbarBtn>
          <ToolbarBtn onClick={openImageMenu} active={false} title="이미지">
            <Icon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" size={13} />
          </ToolbarBtn>
          {insertMenu && (
            <InsertPopover
              label={insertMenu.type === 'link' ? '링크 URL' : '이미지 URL'}
              placeholder={insertMenu.type === 'link' ? 'https://example.com' : 'https://example.com/image.png'}
              value={insertMenu.value}
              onChange={(nextValue) => setInsertMenu((prev) => ({ ...prev, value: nextValue }))}
              onCancel={() => setInsertMenu(null)}
              onConfirm={handleInsertConfirm}
              confirmLabel={insertMenu.type === 'link' ? '적용' : '삽입'}
            />
          )}
        </div>

        <div className="tiptap-toolbar-group">
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="인용">
            <Icon d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" size={13} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="구분선">
            <Icon d="M5 12h14" />
          </ToolbarBtn>
        </div>
      </div>

      <div className="tiptap-content-area">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default TiptapEditor
