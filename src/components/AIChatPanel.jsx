import { useState, useRef, useEffect, useCallback } from 'react'
import { AI_DEMO_MODE } from '../api/client'
import './AIChatPanel.css'

const WIDTH_KEY = 'kg-ai-panel-width'
const MIN_WIDTH = 280
const MAX_WIDTH = 700
const DEFAULT_WIDTH = 360

function createChatMessage(role, content) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    timestamp: new Date(),
  }
}

function buildDemoReply(question) {
  return `"${question}"에 대한 답변입니다.\n\n실제로는 RAG 시스템을 통해 작성한 노트들을 기반으로 맥락에 맞는 답변을 생성합니다. 현재는 백엔드 연동 전 단계입니다.`
}

const AIChatPanel = ({ isOpen, onClose, externalQuery, onExternalQueryConsumed }) => {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
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

  const sendMessage = useCallback(async (rawQuestion) => {
    const question = rawQuestion.trim()
    if (!question || loading) return false

    setInput('')
    setLoading(true)
    setMessages((prev) => [...prev, createChatMessage('user', question)])

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setMessages((prev) => [...prev, createChatMessage('assistant', buildDemoReply(question))])
      return true
    } catch (error) {
      console.error('AI 응답 실패:', error)
      return false
    } finally {
      setLoading(false)
    }
  }, [loading])

  useEffect(() => {
    if (!externalQuery || !isOpen) return

    setInput(externalQuery)
    onExternalQueryConsumed?.()

    const submitTimer = setTimeout(() => {
      void sendMessage(externalQuery)
    }, 400)

    return () => clearTimeout(submitTimer)
  }, [externalQuery, isOpen, onExternalQueryConsumed, sendMessage])

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

  return (
    <aside
      className={`ai-chat-panel${isOpen ? ' ai-chat-panel--open' : ''}${isResizing ? ' ai-chat-panel--resizing' : ''}`}
      style={isOpen ? { width: panelWidth, minWidth: panelWidth } : undefined}
    >
      <div
        className="ai-resize-handle"
        onMouseDown={handleResizeStart}
        title="드래그하여 크기 조절"
        aria-label="패널 크기 조절"
      >
        <div className="ai-resize-handle-bar" />
      </div>

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

      <div className="ai-messages" role="log" aria-live="polite">
        {messages.length === 0 && !loading ? (
          <div className="ai-empty-state">
            <div className="ai-empty-icon">⬡</div>
            <p className="ai-empty-title">무엇이든 물어보세요</p>
            <p className="ai-empty-desc">작성한 노트를 기반으로 질문에 답변합니다.</p>
            {AI_DEMO_MODE && <p className="ai-empty-desc">현재 데모 응답 모드로 동작 중입니다.</p>}
            <ul className="ai-empty-suggestions">
              <li className="ai-suggestion" onClick={() => setInput('이 노트에서 핵심 개념 3개를 정리해줘')}>
                핵심 개념 정리해줘
              </li>
              <li className="ai-suggestion" onClick={() => setInput('최근 작성한 노트 요약해줘')}>
                최근 노트 요약
              </li>
              <li className="ai-suggestion" onClick={() => setInput('내 기술 스택을 분석해줘')}>
                기술 스택 분석
              </li>
            </ul>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`ai-message ai-message--${message.role}`}>
              <div className="ai-message-bubble">
                <p className="ai-message-content">{message.content}</p>
              </div>
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
