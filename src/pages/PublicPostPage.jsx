import { useState, useEffect } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import '../styles/hljs-theme.css'
import { fetchPublicNote } from '../api/client'
import './PublicPostPage.css'
import '../components/MarkdownBody.css'
import MermaidCodeBlock from '../components/MermaidCodeBlock'

const formatDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

const estimateReadTime = (content = '') => {
  const mins = Math.max(1, Math.round(content.length / 500))
  return `읽기 ${mins}분`
}

const PublicPostPage = () => {
  const { username, noteId } = useParams()
  const location = useLocation()
  const basePath = location.pathname.startsWith('/users/') ? `/users/${username}` : `/@${username}`
  const [note, setNote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      if (!noteId) return
      setLoading(true)
      setNotFound(false)
      setError(null)
      try {
        const data = await fetchPublicNote(username, noteId)
        setNote(data)
      } catch (e) {
        if (e.message === 'NOT_FOUND') {
          setNotFound(true)
        } else {
          setError('노트를 불러올 수 없습니다.')
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [username, noteId])

  if (loading) {
    return (
      <div className="pub-post-page">
        <div className="pub-post-container">
          <div className="pub-loading" aria-live="polite">
            <span className="pub-loading-dot" />
            <span className="pub-loading-dot" />
            <span className="pub-loading-dot" />
          </div>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="pub-post-page">
        <div className="pub-post-container">
          <Link to={basePath} className="pub-post-back">
            ← @{username}의 노트
          </Link>
          <div className="pub-post-notfound">
            <p>노트를 찾을 수 없습니다.</p>
            <Link to={basePath} className="pub-post-back-link">노트로 돌아가기</Link>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pub-post-page">
        <div className="pub-post-container">
          <Link to={basePath} className="pub-post-back">
            ← @{username}의 노트
          </Link>
          <div className="pub-post-error">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="pub-post-page">
      <div className="pub-post-container">

        {/* ── Back link ─────────────────────────────────── */}
        <Link to={basePath} className="pub-post-back">
          ← @{username}의 노트
        </Link>

        {/* ── Article ───────────────────────────────────── */}
        <article className="pub-article" aria-label={note.title}>
          <header className="pub-article-header">
            <h1 className="pub-article-title">{note.title}</h1>

            <div className="pub-article-meta">
              <time className="pub-article-date" dateTime={note.createdAt}>
                {formatDate(note.createdAt)}
              </time>

              {note.category && (
                <>
                  <span className="pub-meta-sep">·</span>
                  <span className="pub-article-category">{note.category.name}</span>
                </>
              )}

              <span className="pub-meta-sep">·</span>
              <span className="pub-article-readtime">{estimateReadTime(note.content)}</span>
            </div>
          </header>

          <div className="pub-article-divider" role="separator" />

          <div className="pub-article-body markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{ code: MermaidCodeBlock }}
            >
              {note.content}
            </ReactMarkdown>
          </div>
        </article>

        {/* ── Note navigation ───────────────────────────── */}
        {(note.prevNote || note.nextNote) && (
          <>
            <div className="pub-article-divider" role="separator" />
            <nav className="pub-post-nav" aria-label="이전/다음 노트">
              <div className="pub-post-nav-prev">
                {note.prevNote ? (
                  <Link to={`${basePath}/${note.prevNote.id}`} className="pub-post-nav-link">
                    <span className="pub-post-nav-label">← 이전 노트</span>
                    <span className="pub-post-nav-title">{note.prevNote.title}</span>
                  </Link>
                ) : (
                  <span />
                )}
              </div>
              <div className="pub-post-nav-next">
                {note.nextNote ? (
                  <Link to={`${basePath}/${note.nextNote.id}`} className="pub-post-nav-link pub-post-nav-link--right">
                    <span className="pub-post-nav-label">다음 노트 →</span>
                    <span className="pub-post-nav-title">{note.nextNote.title}</span>
                  </Link>
                ) : (
                  <span />
                )}
              </div>
            </nav>
          </>
        )}

      </div>
    </div>
  )
}

export default PublicPostPage
