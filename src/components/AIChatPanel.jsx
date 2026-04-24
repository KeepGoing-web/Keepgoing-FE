import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { fetchNote } from '../api/client'
import { sendAiPanelMessage } from '../api/aiPanel'
import RichMarkdown from './RichMarkdown'
import './MarkdownBody.css'
import './AIChatPanel.css'

const WIDTH_KEY = 'kg-ai-panel-width'
const MIN_WIDTH = 300
const MAX_WIDTH = 720
const DEFAULT_WIDTH = 380

const NOTE_CONTEXT_SUGGESTIONS = [
  { label: '현재 문서 3줄 요약', prompt: '현재 문서를 3줄로 요약해줘' },
  { label: '핵심 액션 아이템 정리', prompt: '현재 문서를 바탕으로 바로 실행할 액션 아이템을 정리해줘' },
  { label: '놓친 질문 찾기', prompt: '현재 문서를 읽고 추가로 고민해야 할 질문 3개를 제안해줘' },
]

const GENERAL_SUGGESTIONS = [
  { label: '회의록 템플릿 만들기', prompt: '개인 지식관리용 회의록 템플릿을 마크다운으로 만들어줘' },
  { label: '블로그 개요 초안', prompt: '생산성 관련 블로그 글 개요를 5개 섹션으로 짜줘' },
  { label: '아이디어 정리 도와줘', prompt: '흩어진 아이디어를 정리하는 질문 리스트를 만들어줘' },
]

function normalizeContextNoteId(contextNoteId) {
  if (contextNoteId === undefined || contextNoteId === null || contextNoteId === '') {
    return null
  }

  const numericContextNoteId = Number(contextNoteId)
  return Number.isFinite(numericContextNoteId) ? numericContextNoteId : contextNoteId
}

function getRouteContextNoteId(pathname) {
  const editMatch = pathname.match(/^\/notes\/edit\/([^/?#]+)/)
  if (editMatch) {
    return normalizeContextNoteId(editMatch[1])
  }

  const detailMatch = pathname.match(/^\/notes\/([^/?#]+)/)
  if (!detailMatch) {
    return null
  }

  if (['list', 'write'].includes(detailMatch[1])) {
    return null
  }

  return normalizeContextNoteId(detailMatch[1])
}

function getExternalContextNoteId(externalRequest) {
  return normalizeContextNoteId(
    externalRequest?.contextNoteId ?? externalRequest?.scope?.currentNoteId ?? null,
  )
}

function createChatMessage(role, content, meta = null) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    timestamp: new Date(),
    meta,
  }
}

function createAssistantMessage(response) {
  return createChatMessage(
    'assistant',
    response?.assistantMessage || '응답을 받았지만 표시할 내용이 비어 있습니다.',
    {
      contextAttached: Boolean(response?.contextAttached),
      contextNoteId: normalizeContextNoteId(response?.contextNoteId),
      isError: false,
    },
  )
}

function getAiPanelErrorMessage(error) {
  if (error?.status === 400) {
    return '메시지를 보낼 수 없어요. 입력 내용을 다시 확인해 주세요.'
  }

  if (error?.status === 401) {
    return '로그인이 만료되어 AI 응답을 불러올 수 없어요. 다시 로그인해 주세요.'
  }

  if (error?.status === 403) {
    return '현재 문맥으로 선택한 노트에 접근할 수 없어 응답을 만들지 못했어요.'
  }

  if (error?.status === 404) {
    return '연결된 노트를 찾지 못했어요. 다른 노트에서 다시 시도해 주세요.'
  }

  return 'AI 응답을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.'
}

function createErrorMessage(error, contextNoteId) {
  return createChatMessage('assistant', getAiPanelErrorMessage(error), {
    contextAttached: false,
    contextNoteId: normalizeContextNoteId(contextNoteId),
    isError: true,
  })
}

const AIChatPanel = ({
  isOpen,
  onClose,
  externalRequest,
  onExternalRequestConsumed,
  variant = 'panel',
  title = 'AI 어시스턴트',
}) => {
  const location = useLocation()
  const isInline = variant === 'inline'
  const routeContextNoteId = useMemo(() => getRouteContextNoteId(location.pathname), [location.pathname])
  const requestedContextNoteId = useMemo(() => getExternalContextNoteId(externalRequest), [externalRequest])
  const activeContextNoteId = requestedContextNoteId ?? routeContextNoteId

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [contextTitle, setContextTitle] = useState('')
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

  const suggestions = activeContextNoteId ? NOTE_CONTEXT_SUGGESTIONS : GENERAL_SUGGESTIONS

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading, scrollToBottom])

  useEffect(() => {
    if (!isOpen || !inputRef.current) return
    const focusTimer = setTimeout(() => inputRef.current?.focus(), isInline ? 120 : 280)
    return () => clearTimeout(focusTimer)
  }, [isInline, isOpen])

  useEffect(() => {
    let ignore = false

    if (!activeContextNoteId) {
      setContextTitle('')
      return undefined
    }

    const loadContextNote = async () => {
      try {
        const note = await fetchNote(activeContextNoteId)
        if (!ignore) {
          setContextTitle(note?.title || '')
        }
      } catch {
        if (!ignore) {
          setContextTitle('')
        }
      }
    }

    void loadContextNote()

    return () => {
      ignore = true
    }
  }, [activeContextNoteId])

  const sendMessage = useCallback(async (rawMessage, overrideContextNoteId = activeContextNoteId) => {
    const message = String(rawMessage || '').trim()
    if (!message || loading) return false

    const contextNoteId = normalizeContextNoteId(overrideContextNoteId)

    setInput('')
    setLoading(true)
    setMessages((prev) => [
      ...prev,
      createChatMessage('user', message, contextNoteId ? { contextNoteId } : null),
    ])

    try {
      const response = await sendAiPanelMessage({
        message,
        contextNoteId,
      })

      setMessages((prev) => [...prev, createAssistantMessage(response)])
      return true
    } catch (error) {
      console.error('AI 패널 응답 실패:', error)
      setMessages((prev) => [...prev, createErrorMessage(error, contextNoteId)])
      return false
    } finally {
      setLoading(false)
    }
  }, [activeContextNoteId, loading])

  useEffect(() => {
    if (!externalRequest?.query || !isOpen) return

    setInput(externalRequest.query)

    const externalContextNoteId = getExternalContextNoteId(externalRequest) ?? routeContextNoteId
    const submitTimer = setTimeout(() => {
      void sendMessage(externalRequest.query, externalContextNoteId).finally(() => {
        onExternalRequestConsumed?.()
      })
    }, isInline ? 120 : 360)

    return () => clearTimeout(submitTimer)
  }, [externalRequest, isInline, isOpen, onExternalRequestConsumed, routeContextNoteId, sendMessage])

  const handleResizeStart = useCallback((event) => {
    event.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing || isInline) return undefined

    let nextStoredWidth = panelWidth

    const handleResizeMove = (event) => {
      nextStoredWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - event.clientX))
      setPanelWidth(nextStoredWidth)
    }

    const handleResizeEnd = () => {
      setIsResizing(false)
      try {
        localStorage.setItem(WIDTH_KEY, String(nextStoredWidth))
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
  }, [isInline, isResizing, panelWidth])

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

  const formatTime = (date) => date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const contextDescription = activeContextNoteId
    ? `${contextTitle || `노트 #${activeContextNoteId}`}의 제목과 본문이 함께 전달됩니다.`
    : '현재는 일반 질문 모드입니다. 노트를 열어두면 해당 문서를 문맥으로 함께 보낼 수 있습니다.'

  return (
    <aside
      className={`ai-chat-panel${isOpen ? ' ai-chat-panel--open' : ''}${isResizing ? ' ai-chat-panel--resizing' : ''}${isInline ? ' ai-chat-panel--inline' : ''}`}
      style={!isInline && isOpen ? { width: panelWidth, minWidth: panelWidth } : undefined}
      aria-hidden={!isOpen && !isInline}
    >
      {!isInline && (
        <div
          className="ai-resize-handle"
          onMouseDown={handleResizeStart}
          title="드래그하여 크기 조절"
          aria-label="패널 크기 조절"
        >
          <div className="ai-resize-handle-bar" />
        </div>
      )}

      <div className="ai-panel-header">
        <div className="ai-panel-title">
          <span className="ai-panel-icon">⬡</span>
          <span>{title}</span>
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
            title={isInline ? '대화 닫기' : '패널 닫기'}
            aria-label={isInline ? '대화 닫기' : 'AI 패널 닫기'}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="ai-context-bar">
        <div className="ai-context-copy">
          <span className={`ai-context-badge${activeContextNoteId ? ' ai-context-badge--attached' : ''}`}>
            {activeContextNoteId ? '현재 노트 문맥 연결됨' : '일반 AI 대화'}
          </span>
          <p className="ai-context-text">{contextDescription}</p>
        </div>
        {activeContextNoteId ? (
          <span className="ai-context-note-id">#{activeContextNoteId}</span>
        ) : null}
      </div>

      <div className="ai-messages" role="log" aria-live="polite">
        {messages.length === 0 && !loading ? (
          <div className="ai-empty-state">
            <div className="ai-empty-icon">⬡</div>
            <p className="ai-empty-title">
              {activeContextNoteId ? '현재 노트를 바탕으로 바로 질문할 수 있습니다.' : 'AI와 바로 대화를 시작할 수 있습니다.'}
            </p>
            <p className="ai-empty-desc">{contextDescription}</p>
            {!isInline && (
              <ul className="ai-empty-suggestions">
                {suggestions.map((suggestion) => (
                  <li key={suggestion.label} className="ai-suggestion" onClick={() => setInput(suggestion.prompt)}>
                    {suggestion.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          messages.map((message) => {
            const isAssistant = message.role === 'assistant'
            const meta = message.meta || null
            const metaItems = []

            if (meta?.isError) {
              metaItems.push('전송 실패')
            } else if (isAssistant) {
              metaItems.push(meta?.contextAttached ? '노트 문맥 포함 응답' : '일반 응답')
            } else if (meta?.contextNoteId) {
              metaItems.push('현재 노트 기준 질문')
            }

            if (meta?.contextNoteId) {
              metaItems.push(`#${meta.contextNoteId}`)
            }

            return (
              <div key={message.id} className={`ai-message ai-message--${message.role}`}>
                <div className={`ai-message-bubble${meta?.isError ? ' ai-message-bubble--error' : ''}`}>
                  {isAssistant ? (
                    <div className="ai-message-markdown markdown-body">
                      <RichMarkdown>{message.content}</RichMarkdown>
                    </div>
                  ) : (
                    <p className="ai-message-content">{message.content}</p>
                  )}
                  {metaItems.length > 0 ? (
                    <div className="ai-message-meta">
                      {metaItems.map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <span className="ai-message-time">{formatTime(message.timestamp)}</span>
              </div>
            )
          })
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

      <form className="ai-input-form" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          className="ai-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={activeContextNoteId ? '현재 노트를 기준으로 질문하세요...' : 'AI에게 질문하세요...'}
          rows={2}
          disabled={loading}
        />
        <button className="ai-send-btn" type="submit" disabled={loading || !input.trim()}>
          전송
        </button>
      </form>
    </aside>
  )
}

export default AIChatPanel
