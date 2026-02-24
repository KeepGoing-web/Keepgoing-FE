import { useState, useRef, useEffect } from 'react'
import { useToast } from '../contexts/ToastContext'
import './RAGQueryPage.css'

const RAGQueryPage = () => {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!query.trim() || loading) return

    const question = query
    setQuery('')
    setLoading(true)

    // TODO: API 호출로 RAG 질의 수행
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      const answer = `질문에 대한 답변입니다. 실제로는 RAG 시스템을 통해 작성한 포스트들을 기반으로 답변을 생성합니다.\n\n질문: "${question}"`
      const newMessage = {
        id: Date.now().toString(),
        question,
        answer,
        timestamp: new Date(),
      }
      setMessages([...messages, newMessage])
    } catch (error) {
      console.error('질의 실패:', error)
      toast.error('질의에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rag-query-page">
      <div className="page-header">
        <h1>RAG 질의</h1>
        <p className="page-description">
          작성한 포스트들을 기반으로 AI가 질문에 답변합니다.
        </p>
      </div>
      <div className="query-container">
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">⬡</div>
              <h3 className="empty-state-title">AI에게 질문하세요</h3>
              <p className="empty-state-desc">
                작성한 포스트를 기반으로 AI가 답변을 생성합니다.
              </p>
              <p className="empty-state-hint">
                <strong>팁:</strong> "AI 수집" 설정이 켜진 포스트만 분석 대상이 됩니다.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="message-group">
                <div className="message question">
                  <div className="message-header">질문</div>
                  <div className="message-content">{message.question}</div>
                </div>
                <div className="message answer">
                  <div className="message-header">답변</div>
                  <div className="message-content">{message.answer}</div>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="message answer loading">
              <div className="message-header">답변 생성 중...</div>
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSubmit} className="query-form">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="질문을 입력하세요..."
            disabled={loading}
            className="query-input"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="query-button"
          >
            전송
          </button>
        </form>
      </div>
    </div>
  )
}

export default RAGQueryPage
