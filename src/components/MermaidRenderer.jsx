import { useEffect, useRef, useState, useCallback, useId } from 'react'
import mermaid from 'mermaid'
import DOMPurify from 'dompurify'
import { initMermaidWithTheme } from '../utils/mermaidTheme'
import './MermaidRenderer.css'

function sanitizeMermaidSvg(svg) {
  if (typeof svg !== 'string' || !svg) return ''
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['use'],
    KEEP_CONTENT: true,
  })
}

const MermaidRenderer = ({ code }) => {
  const reactId = useId()
  const idRef = useRef(`mermaid-${reactId.replace(/[^a-z0-9]/gi, '-')}`)
  const [svg, setSvg] = useState('')
  const [error, setError] = useState(null)
  const [showCode, setShowCode] = useState(false)

  const renderDiagram = useCallback(async () => {
    if (!code?.trim()) {
      setSvg('')
      setError(null)
      return
    }

    initMermaidWithTheme()

    try {
      // mermaid.render needs a unique ID each time
      const uniqueId = `${idRef.current}-${Date.now()}`
      const { svg: rendered } = await mermaid.render(uniqueId, code.trim())
      setSvg(sanitizeMermaidSvg(rendered))
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
    <div className="mermaid-renderer">
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
