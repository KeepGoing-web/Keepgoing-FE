import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchBlogs } from '../api/client'
import './CommandPalette.css'

const CommandPalette = ({ isOpen, onClose, onAIQuery }) => {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)

  /* Focus input when opened */
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  /* Search posts on query change */
  useEffect(() => {
    if (!isOpen || !query.trim()) {
      setResults([])
      setSelectedIndex(0)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetchBlogs({ q: query.trim(), page: 1, size: 8 })
        setResults(res.posts || [])
        setSelectedIndex(0)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [query, isOpen])

  /* Total items: results + AI option (when query exists) */
  const hasAIOption = query.trim().length > 0
  const totalItems = results.length + (hasAIOption ? 1 : 0)

  /* Navigate to selected result */
  const selectResult = useCallback((index) => {
    if (hasAIOption && index === results.length) {
      /* AI query option */
      onAIQuery?.(query.trim())
      onClose()
      return
    }
    const post = results[index]
    if (post) {
      navigate(`/blogs/${post.id}`)
      onClose()
    }
  }, [results, query, hasAIOption, navigate, onClose, onAIQuery])

  /* Keyboard navigation */
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalItems))
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + totalItems) % Math.max(1, totalItems))
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (totalItems > 0) {
        selectResult(selectedIndex)
      }
      return
    }
  }

  if (!isOpen) return null

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-palette" onClick={(e) => e.stopPropagation()}>

        {/* Search input */}
        <div className="cmd-input-wrap">
          <span className="cmd-input-icon">⌕</span>
          <input
            ref={inputRef}
            className="cmd-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="포스트 검색 또는 AI에게 질문..."
            aria-label="검색"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="cmd-kbd">ESC</kbd>
        </div>

        {/* Results */}
        <div className="cmd-results" role="listbox">
          {loading && (
            <div className="cmd-loading">검색 중...</div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <div className="cmd-no-results">
              일치하는 포스트가 없습니다
            </div>
          )}

          {results.map((post, i) => (
            <button
              key={post.id}
              className={`cmd-result-item${i === selectedIndex ? ' cmd-result-item--selected' : ''}`}
              role="option"
              aria-selected={i === selectedIndex}
              onClick={() => selectResult(i)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className="cmd-result-icon">📄</span>
              <div className="cmd-result-info">
                <span className="cmd-result-title">{post.title}</span>
                {post.category && (
                  <span className="cmd-result-cat">{post.category.name || post.category}</span>
                )}
              </div>
              {Array.isArray(post.tags) && post.tags.length > 0 && (
                <div className="cmd-result-tags">
                  {post.tags.slice(0, 3).map((t) => (
                    <span key={t.id} className="cmd-result-tag">#{t.name}</span>
                  ))}
                </div>
              )}
            </button>
          ))}

          {/* AI query option */}
          {hasAIOption && (
            <>
              {results.length > 0 && <div className="cmd-divider" />}
              <button
                className={`cmd-result-item cmd-ai-option${selectedIndex === results.length ? ' cmd-result-item--selected' : ''}`}
                role="option"
                aria-selected={selectedIndex === results.length}
                onClick={() => selectResult(results.length)}
                onMouseEnter={() => setSelectedIndex(results.length)}
              >
                <span className="cmd-result-icon">⬡</span>
                <div className="cmd-result-info">
                  <span className="cmd-result-title">AI에게 질문하기</span>
                  <span className="cmd-ai-query">"{query.trim()}"</span>
                </div>
                <span className="cmd-ai-badge">AI</span>
              </button>
            </>
          )}
        </div>

        {/* Footer hints */}
        <div className="cmd-footer">
          <span className="cmd-hint"><kbd>↑↓</kbd> 이동</span>
          <span className="cmd-hint"><kbd>↵</kbd> 선택</span>
          <span className="cmd-hint"><kbd>esc</kbd> 닫기</span>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette
