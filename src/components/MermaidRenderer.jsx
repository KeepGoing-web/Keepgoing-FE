import { useEffect, useRef, useState, useCallback } from 'react'
import mermaid from 'mermaid'
import './MermaidRenderer.css'

let idCounter = 0

const MermaidRenderer = ({ code }) => {
  const containerRef = useRef(null)
  const idRef = useRef(`mermaid-${++idCounter}`)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState(null)
  const [showCode, setShowCode] = useState(false)

  const renderDiagram = useCallback(async () => {
    if (!code?.trim()) {
      setSvg('')
      setError(null)
      return
    }

    const theme = document.documentElement.getAttribute('data-theme')
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'light' ? 'default' : 'dark',
      fontFamily: 'var(--font-sans)',
      themeVariables:
        theme === 'light'
          ? {
              primaryColor: '#d1fae5',
              primaryTextColor: '#1e293b',
              primaryBorderColor: '#0d9488',
              lineColor: '#64748b',
              secondaryColor: '#e2e8f0',
              tertiaryColor: '#f1f5f9',
              noteBkgColor: '#fef3c7',
              noteTextColor: '#1e293b',
              noteBorderColor: '#f59e0b',
            }
          : {
              primaryColor: '#1e3a3a',
              primaryTextColor: '#cdd6f4',
              primaryBorderColor: '#2dd4bf',
              lineColor: '#6c7086',
              secondaryColor: '#313244',
              tertiaryColor: '#1e1e2e',
              noteBkgColor: '#45475a',
              noteTextColor: '#cdd6f4',
              noteBorderColor: '#f9e2af',
            },
    })

    try {
      // mermaid.render needs a unique ID each time
      const uniqueId = `${idRef.current}-${Date.now()}`
      const { svg: rendered } = await mermaid.render(uniqueId, code.trim())
      setSvg(rendered)
      setError(null)
    } catch (err) {
      setSvg('')
      setError(err?.message || '다이어그램 렌더링 실패')
      // Clean up any orphaned mermaid error elements
      const errEl = document.getElementById(`d${idRef.current}`)
      if (errEl) errEl.remove()
    }
  }, [code])

  useEffect(() => {
    renderDiagram()
  }, [renderDiagram])

  /* Re-render on theme change */
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'data-theme') {
          renderDiagram()
          break
        }
      }
    })
    observer.observe(document.documentElement, { attributes: true })
    return () => observer.disconnect()
  }, [renderDiagram])

  return (
    <div className="mermaid-renderer" ref={containerRef}>
      <div className="mermaid-header">
        <span className="mermaid-label">Mermaid</span>
        <button
          type="button"
          className="mermaid-toggle-btn"
          onClick={() => setShowCode((v) => !v)}
          aria-label={showCode ? '다이어그램 보기' : '코드 보기'}
        >
          {showCode ? '다이어그램' : '코드'}
        </button>
      </div>

      {showCode ? (
        <pre className="mermaid-source">
          <code>{code}</code>
        </pre>
      ) : error ? (
        <div className="mermaid-error">
          <span className="mermaid-error-icon">!</span>
          <span className="mermaid-error-text">{error}</span>
          <pre className="mermaid-error-code"><code>{code}</code></pre>
        </div>
      ) : svg ? (
        <div
          className="mermaid-svg"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="mermaid-empty">다이어그램을 불러오는 중...</div>
      )}
    </div>
  )
}

export default MermaidRenderer
