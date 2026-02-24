import { useRef, useCallback, useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import '../styles/hljs-theme.css'
import './MarkdownBody.css'
import MermaidCodeBlock from './MermaidCodeBlock'
import './MarkdownEditor.css'

/* ── Toolbar action definitions ──────────────────────────────── */
const TOOLBAR_GROUPS = [
  [
    { id: 'bold',          label: 'B',   title: 'Bold (Ctrl+B)',         wrap: ['**', '**'],       placeholder: 'bold text' },
    { id: 'italic',        label: 'I',   title: 'Italic (Ctrl+I)',       wrap: ['*', '*'],          placeholder: 'italic text' },
    { id: 'strikethrough', label: 'S',   title: 'Strikethrough',         wrap: ['~~', '~~'],        placeholder: 'strikethrough' },
  ],
  [
    { id: 'h1', label: 'H1', title: 'Heading 1', linePrefix: '# ' },
    { id: 'h2', label: 'H2', title: 'Heading 2', linePrefix: '## ' },
    { id: 'h3', label: 'H3', title: 'Heading 3', linePrefix: '### ' },
  ],
  [
    { id: 'ul',        label: '•',  title: 'Bullet list',    linePrefix: '- ' },
    { id: 'ol',        label: '1.', title: 'Numbered list',  linePrefix: '1. ' },
    { id: 'checklist', label: '☑',  title: 'Checklist',      linePrefix: '- [ ] ' },
  ],
  [
    { id: 'inlinecode', label: '<>',  title: 'Inline code',  wrap: ['`', '`'],               placeholder: 'code' },
    { id: 'codeblock',  label: '```', title: 'Code block',   block: true,                    placeholder: 'code' },
  ],
  [
    { id: 'link',  label: '🔗', title: 'Link (Ctrl+K)',  special: 'link'  },
    { id: 'image', label: '📷', title: 'Image',          special: 'image' },
  ],
  [
    { id: 'quote', label: '❝',  title: 'Blockquote', linePrefix: '> ' },
    { id: 'hr',    label: '—',  title: 'Divider',    insert: '\n\n---\n\n' },
  ],
]

/* ── Text manipulation helpers ──────────────────────────────── */
function insertAtCursor(textarea, before, after, placeholder) {
  const start = textarea.selectionStart
  const end   = textarea.selectionEnd
  const selected = textarea.value.slice(start, end)
  const text = selected || placeholder || ''
  const newVal = textarea.value.slice(0, start) + before + text + after + textarea.value.slice(end)
  const newStart = start + before.length
  const newEnd   = newStart + text.length
  return { value: newVal, selectionStart: newStart, selectionEnd: newEnd }
}

function toggleLinePrefix(textarea, prefix) {
  const val   = textarea.value
  const start = textarea.selectionStart
  const end   = textarea.selectionEnd

  // find line boundaries for the selection
  const lineStart = val.lastIndexOf('\n', start - 1) + 1
  const lineEnd   = val.indexOf('\n', end)
  const realEnd   = lineEnd === -1 ? val.length : lineEnd

  const selectedLines = val.slice(lineStart, realEnd).split('\n')
  const allPrefixed   = selectedLines.every((l) => l.startsWith(prefix))

  const newLines = selectedLines.map((l) =>
    allPrefixed ? l.slice(prefix.length) : prefix + l
  )
  const replacement = newLines.join('\n')
  const delta = allPrefixed ? -prefix.length : prefix.length

  const newVal = val.slice(0, lineStart) + replacement + val.slice(realEnd)
  const newStart = Math.max(lineStart, start + delta)
  const newEnd   = end + delta * selectedLines.length

  return { value: newVal, selectionStart: newStart, selectionEnd: newEnd }
}

function insertCodeBlock(textarea, placeholder) {
  const start    = textarea.selectionStart
  const end      = textarea.selectionEnd
  const selected = textarea.value.slice(start, end) || placeholder
  const before   = textarea.value.slice(0, start)
  const after    = textarea.value.slice(end)

  // auto-detect language hint from context (optional)
  const block    = '```\n' + selected + '\n```'
  const newVal   = before + block + after
  const newStart = start + 4
  const newEnd   = newStart + selected.length

  return { value: newVal, selectionStart: newStart, selectionEnd: newEnd }
}

function insertSpecial(textarea, type) {
  const start    = textarea.selectionStart
  const end      = textarea.selectionEnd
  const selected = textarea.value.slice(start, end)

  let snippet, newStart, newEnd
  if (type === 'link') {
    const text = selected || '링크 텍스트'
    snippet    = `[${text}](url)`
    newStart   = start + text.length + 3  // position on "url"
    newEnd     = newStart + 3
  } else {
    const alt = selected || '이미지 설명'
    snippet   = `![${alt}](url)`
    newStart  = start + alt.length + 4
    newEnd    = newStart + 3
  }

  const newVal = textarea.value.slice(0, start) + snippet + textarea.value.slice(end)
  return { value: newVal, selectionStart: newStart, selectionEnd: newEnd }
}

/* ── Main component ─────────────────────────────────────────── */
const MarkdownEditor = ({ value = '', onChange, placeholder = '마크다운으로 내용을 작성하세요...' }) => {
  const textareaRef = useRef(null)
  const [activeTab, setActiveTab] = useState('editor') // 'editor' | 'preview' | 'split'
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e) => {
      setIsMobile(e.matches)
      if (e.matches && activeTab === 'split') setActiveTab('editor')
    }
    setIsMobile(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [activeTab])

  const applyAction = useCallback((action) => {
    const ta = textareaRef.current
    if (!ta) return

    let result
    if (action.insert) {
      const start = ta.selectionStart
      const newVal = ta.value.slice(0, start) + action.insert + ta.value.slice(start)
      const pos = start + action.insert.length
      result = { value: newVal, selectionStart: pos, selectionEnd: pos }
    } else if (action.linePrefix) {
      result = toggleLinePrefix(ta, action.linePrefix)
    } else if (action.block) {
      result = insertCodeBlock(ta, action.placeholder)
    } else if (action.special) {
      result = insertSpecial(ta, action.special)
    } else if (action.wrap) {
      result = insertAtCursor(ta, action.wrap[0], action.wrap[1], action.placeholder)
    }

    if (!result) return

    onChange(result.value)

    // Restore focus + selection after React re-render
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(result.selectionStart, result.selectionEnd)
    })
  }, [onChange])

  const handleKeyDown = useCallback((e) => {
    const ta = textareaRef.current
    if (!ta) return

    // Tab / Shift+Tab — indent/outdent
    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        // outdent: remove up to 2 leading spaces
        const start = ta.selectionStart
        const lineStart = ta.value.lastIndexOf('\n', start - 1) + 1
        const spaces = ta.value.slice(lineStart).match(/^ {1,2}/)
        if (spaces) {
          const rem = spaces[0].length
          const newVal = ta.value.slice(0, lineStart) + ta.value.slice(lineStart + rem)
          onChange(newVal)
          requestAnimationFrame(() => {
            ta.setSelectionRange(start - rem, start - rem)
          })
        }
      } else {
        const start = ta.selectionStart
        const end   = ta.selectionEnd
        const newVal = ta.value.slice(0, start) + '  ' + ta.value.slice(end)
        onChange(newVal)
        requestAnimationFrame(() => {
          ta.setSelectionRange(start + 2, start + 2)
        })
      }
      return
    }

    // Ctrl/Cmd shortcuts
    const ctrl = e.ctrlKey || e.metaKey
    if (!ctrl) return

    const shortcuts = {
      b: { wrap: ['**', '**'], placeholder: 'bold text' },
      i: { wrap: ['*', '*'],   placeholder: 'italic text' },
      k: { special: 'link' },
    }
    const action = shortcuts[e.key.toLowerCase()]
    if (action) {
      e.preventDefault()
      applyAction(action)
    }
  }, [applyAction, onChange])

  const showEditor  = activeTab === 'editor' || activeTab === 'split'
  const showPreview = activeTab === 'preview' || activeTab === 'split'

  return (
    <div className="md-editor" data-tab={activeTab}>
      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="md-toolbar" role="toolbar" aria-label="마크다운 에디터 툴바">
        <div className="md-toolbar-groups">
          {TOOLBAR_GROUPS.map((group, gi) => (
            <div key={gi} className="md-toolbar-group">
              {group.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className={`md-toolbar-btn md-toolbar-btn--${action.id}`}
                  title={action.title}
                  aria-label={action.title}
                  onMouseDown={(e) => {
                    e.preventDefault() // don't lose textarea focus
                    applyAction(action)
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* ── View toggle ─────────────────────────────────── */}
        <div className="md-toolbar-tabs" role="group" aria-label="보기 모드">
          <button
            type="button"
            className={`md-tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
            aria-pressed={activeTab === 'editor'}
          >
            편집
          </button>
          {!isMobile && (
            <button
              type="button"
              className={`md-tab-btn ${activeTab === 'split' ? 'active' : ''}`}
              onClick={() => setActiveTab('split')}
              aria-pressed={activeTab === 'split'}
            >
              분할
            </button>
          )}
          <button
            type="button"
            className={`md-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
            aria-pressed={activeTab === 'preview'}
          >
            미리보기
          </button>
        </div>
      </div>

      {/* ── Panes ───────────────────────────────────────────── */}
      <div className="md-panes">
        {showEditor && (
          <div className="md-pane md-pane--editor">
            <textarea
              ref={textareaRef}
              className="md-textarea"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              spellCheck={false}
              aria-label="마크다운 편집기"
              aria-multiline="true"
            />
          </div>
        )}

        {showPreview && (
          <div className="md-pane md-pane--preview" aria-label="미리보기">
            {value ? (
              <div className="markdown-body md-preview-body">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{ code: MermaidCodeBlock }}
                >
                  {value}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="md-preview-empty">
                <span>미리볼 내용이 없습니다.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default MarkdownEditor
