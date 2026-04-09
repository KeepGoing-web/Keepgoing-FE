import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AI_DEMO_MODE, fetchNote } from '../api/client'
import { getRAGScopeLabel, queryRAG } from '../api/rag'
import { buildRAGWorkspaceHref } from '../utils/ai'
import './AIChatPanel.css'

const WIDTH_KEY = 'kg-ai-panel-width'
const MIN_WIDTH = 280
const MAX_WIDTH = 700
const DEFAULT_WIDTH = 360
const DEFAULT_SCOPE = {
  mode: 'all',
  currentNoteId: null,
  aiOnly: true,
}
const SCOPE_OPTIONS = [
  { value: 'all', label: '전체 지식베이스' },
  { value: 'notes', label: '메모만' },
  { value: 'blogs', label: '블로그만' },
  { value: 'current-note', label: '현재 문서' },
]

function createChatMessage(role, content) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    timestamp: new Date(),
    meta: null,
  }
}

function createAssistantMessage(result, question, scope) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: 'assistant',
    content: result.answer?.text || `"${question}"에 대한 답변을 만들었습니다.`,
    timestamp: new Date(),
    meta: {
      scope,
      summary: result.answer?.summary,
      sourceCount: result.sources?.length || 0,
      workspaceHref: buildRAGWorkspaceHref({ query: question, scope }),
    },
  }
}

const PANEL_SUGGESTIONS = [
  { label: '현재 문서 핵심 3줄 요약', prompt: '현재 문서의 핵심 개념 3개를 정리해줘' },
  { label: '관련 노트 찾아줘', prompt: '이 내용과 연결되는 관련 노트를 찾아줘' },
  { label: '블로그 초안으로 바꿔줘', prompt: '이 내용을 블로그 초안 구조로 바꿔줘' },
]

const AIChatPanel = ({
  isOpen,
  onClose,
  externalQuery,
  externalScope,
  onExternalQueryConsumed,
  variant = 'panel',
  embeddedDescription = '',
}) => {
  const navigate = useNavigate()
  const isEmbedded = variant === 'embedded'
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [scope, setScope] = useState(DEFAULT_SCOPE)
  const [scopeContextLabel, setScopeContextLabel] = useState('')
  const [panelWidth, setPanelWidth] = useState(() => {
    try {
      const saved = parseInt(localStorage.getItem(WIDTH_KEY), 10)
      return saved >= MIN_WIDTH && saved <= MAX_WIDTH ? saved : DEFAULT_WIDTH
    } catch {
      return DEFAULT_WIDTH
    }
  })
  const [isResizing, setIsResizing] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading, scrollToBottom])

  useEffect(() => {
    if (!isOpen || !inputRef.current) return
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 350)
    return () => clearTimeout(focusTimer)
  }, [isOpen])

  useEffect(() => {
    if (!externalScope) return
    setScope((prev) => ({ ...prev, ...externalScope }))
  }, [externalScope])

  useEffect(() => {
    const loadScopeContext = async () => {
      if (scope.mode !== 'current-note' || !scope.currentNoteId) {
        setScopeContextLabel('')
        return
      }

      try {
        const note = await fetchNote(scope.currentNoteId)
        setScopeContextLabel(note?.title || '')
      } catch {
        setScopeContextLabel('')
      }
    }

    void loadScopeContext()
  }, [scope.currentNoteId, scope.mode])

  const sendMessage = useCallback(async (rawQuestion, targetScope = scope) => {
    const question = rawQuestion.trim()
    if (!question || loading) return false

    setInput('')
    setLoading(true)
    setMessages((prev) => [...prev, createChatMessage('user', question)])

    try {
      const result = await queryRAG({ query: question, scope: targetScope })
      setMessages((prev) => [...prev, createAssistantMessage(result, question, targetScope)])
      return true
    } catch (error) {
      console.error('AI 응답 실패:', error)
      return false
    } finally {
      setLoading(false)
    }
  }, [loading, scope])

  useEffect(() => {
    if (!externalQuery || !isOpen) return

    setInput(externalQuery)
    onExternalQueryConsumed?.()

    const submitTimer = setTimeout(() => {
      void sendMessage(externalQuery, externalScope || scope)
    }, 400)

    return () => clearTimeout(submitTimer)
  }, [externalQuery, externalScope, isOpen, onExternalQueryConsumed, scope, sendMessage])

  const handleResizeStart = useCallback((event) => {
    event.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return undefined

    const handleResizeMove = (event) => {
      const nextWidth = window.innerWidth - event.clientX
      const clampedWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, nextWidth))
      setPanelWidth(clampedWidth)
    }

    const handleResizeEnd = () => {
      setIsResizing(false)
      try {
        localStorage.setItem(WIDTH_KEY, String(panelWidth))
      } catch {
        // ignore storage errors
      }
    }

    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleResizeMove)
      document.removeEventListener('mouseup', handleResizeEnd)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, panelWidth])

  const handleSubmit = async (event) => {
    event.preventDefault()
    await sendMessage(input)
  }

  const handleClear = () => {
    setMessages([])
    setInput('')
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendMessage(input)
    }
  }

  const formatTime = (date) => date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  const scopeLabel = getRAGScopeLabel(scope)

  return (
    <aside
      className={`ai-chat-panel${isOpen ? ' ai-chat-panel--open' : ''}${isResizing ? ' ai-chat-panel--resizing' : ''}${isEmbedded ? ' ai-chat-panel--embedded' : ''}`}
      style={!isEmbedded && isOpen ? { width: panelWidth, minWidth: panelWidth } : undefined}
    >
      {!isEmbedded && (
        <div
          className="ai-resize-handle"
          onMouseDown={handleResizeStart}
          title="드래그하여 크기 조절"
          aria-label="패널 크기 조절"
        >
          <div className="ai-resize-handle-bar" />
        </div>
      )}

      {!isEmbedded && (
        <>
          <div className="ai-panel-header">
            <div className="ai-panel-title">
              <span className="ai-panel-icon">⬡</span>
              <span>AI 어시스턴트</span>
              {AI_DEMO_MODE && <span className="cmd-ai-badge">DEMO</span>}
            </div>
            <div className="ai-panel-actions">
              {messages.length > 0 && (
                <button
                  className="ai-panel-clear"
                  onClick={handleClear}
                  title="대화 초기화"
                  aria-label="대화 초기화"
                >
                  초기화
                </button>
              )}
              <button
                className="ai-panel-close"
                onClick={onClose}
                title="패널 닫기"
                aria-label="AI 패널 닫기"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="ai-scope-bar">
            <label className="ai-scope-label">
              <span>Scope</span>
              <select
                className="ai-scope-select"
                value={scope.mode}
                onChange={(event) => setScope((prev) => ({ ...prev, mode: event.target.value }))}
              >
                {SCOPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <span className="ai-scope-chip">
              {scopeLabel}
              {scopeContextLabel ? ` · ${scopeContextLabel}` : ''}
            </span>
          </div>
        </>
      )}

      <div className="ai-messages" role="log" aria-live="polite">
        {messages.length === 0 && !loading ? (
          <div className="ai-empty-state">
            {!isEmbedded && <div className="ai-empty-icon">⬡</div>}
            <p className="ai-empty-title">{isEmbedded ? '내 지식에 무엇이든 물어보세요' : '무엇이든 물어보세요'}</p>
            {(!isEmbedded || embeddedDescription) && (
              <p className="ai-empty-desc">
                {isEmbedded
                  ? embeddedDescription
                  : '짧은 응답은 여기서, 근거 확인은 전체 RAG 작업실에서 이어갈 수 있습니다.'}
              </p>
            )}
            {!isEmbedded && AI_DEMO_MODE && <p className="ai-empty-desc">현재 데모 응답 모드로 동작 중입니다.</p>}
            <ul className="ai-empty-suggestions">
              {PANEL_SUGGESTIONS.map((suggestion) => (
                <li key={suggestion.label} className="ai-suggestion" onClick={() => setInput(suggestion.prompt)}>
                  {suggestion.label}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`ai-message ai-message--${message.role}`}>
              <div className="ai-message-bubble">
                <p className="ai-message-content">{message.content}</p>
                {message.role === 'assistant' && message.meta ? (
                  <div className="ai-message-meta">
                    <span>{message.meta.summary}</span>
                    <span>참조 문서 {message.meta.sourceCount}개</span>
                  </div>
                ) : null}
              </div>
              {message.role === 'assistant' && message.meta ? (
                <div className="ai-message-actions">
                  <button type="button" onClick={() => navigate(message.meta.workspaceHref)}>
                    근거 보기
                  </button>
                  <button type="button" onClick={() => navigate(message.meta.workspaceHref)}>
                    작업실에서 이어서 보기
                  </button>
                </div>
              ) : null}
              <span className="ai-message-time">{formatTime(message.timestamp)}</span>
            </div>
          ))
        )}

        {loading && (
          <div className="ai-message ai-message--assistant">
            <div className="ai-message-bubble ai-message-bubble--loading">
              <div className="ai-loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {isEmbedded && (
        <div className="ai-home-toolbar">
          <span className="ai-home-toolbar__scope">{scopeLabel}</span>
          <button type="button" className="ai-home-toolbar__link" onClick={() => navigate('/query')}>
            전체 작업실에서 범위 조정
          </button>
        </div>
      )}

      <form className="ai-input-form" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          className="ai-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="질문을 입력하세요..."
          rows={2}
        />
        <button className="ai-send-btn" type="submit" disabled={loading || !input.trim()}>
          전송
        </button>
      </form>
    </aside>
  )
}

export default AIChatPanel
