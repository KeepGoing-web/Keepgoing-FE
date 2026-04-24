import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import '../styles/hljs-theme.css'
import './BlogDetailPage.css'
import '../components/MarkdownBody.css'
import { fetchNote, deleteNote } from '../api/client'
import RichMarkdown from '../components/RichMarkdown'
import { useVaultOptional } from '../contexts/VaultContext'
import { formatDate, estimateReadTime } from '../utils/format'
import ReadingProgressBar from '../components/ReadingProgressBar'
import { useConfirm } from '../components/ConfirmModal'
import { useToast } from '../contexts/ToastContext'
import { dispatchOpenAIPanel } from '../utils/ai'

const EMPTY_FOLDERS = []

const BlogDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()

  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const vault = useVaultOptional()
  const addRecentNote = vault?.addRecentNote ?? null
  const categories = vault?.categories ?? EMPTY_FOLDERS
  const notesRevision = vault?.notesRevision ?? 0

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetchNote(id)
        setPost(res)
        if (addRecentNote && res) addRecentNote(res)
      } catch (e) {
        if (e.message === 'NOT_FOUND') {
          setPost(null)
        } else {
          setError('불러오기에 실패했습니다.')
        }
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [addRecentNote, id, notesRevision])

  useEffect(() => {
    if (!menuOpen) return undefined

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [menuOpen])

  const getVisibilityLabel = (visibility) => {
    switch (visibility) {
      case 'PUBLIC':
        return '공개'
      case 'PRIVATE':
        return '비공개'
      case 'AI_COLLECTABLE':
        return 'AI 수집 가능'
      default:
        return visibility
    }
  }

  const handleDelete = async () => {
    const ok = await confirm('이 노트를 삭제하시겠습니까?', {
      title: '노트 삭제',
      confirmLabel: '삭제',
      cancelLabel: '취소',
    })
    if (!ok) return
    try {
      await deleteNote(post.id)
      toast.success('노트가 삭제되었습니다.')
      navigate('/notes')
    } catch {
      toast.error('삭제에 실패했습니다.')
    }
  }

  const handleAskAI = () => {
    dispatchOpenAIPanel({
      query: `${post.title}의 핵심 개념 3가지를 정리해줘`,
      contextNoteId: post.id,
    })
  }



  if (loading) {
    return <div className="loading">로딩 중...</div>
  }

  if (!post) {
    return <div className="error">노트를 찾을 수 없습니다.</div>
  }

  const currentFolderId = post.folderId ?? post.categoryId ?? post.category?.id ?? null
  const folderName = post.category?.name || categories.find((category) => String(category.id) === String(currentFolderId))?.name || '전체 문서'
  const truncatedTitle = post.title.length > 30 ? `${post.title.slice(0, 30)}…` : post.title

  return (
    <div className="blog-detail-page">
      <ReadingProgressBar />

      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="blog-actions">
        <nav className="breadcrumb" aria-label="breadcrumb">
          <Link to="/notes" className="breadcrumb-link">대시보드</Link>
          <span className="breadcrumb-sep">/</span>
          <Link to="/notes/list" className="breadcrumb-link">{folderName}</Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current" title={post.title}>{truncatedTitle}</span>
        </nav>

        <div className="blog-actions-right">
          <button className="related-button" onClick={handleAskAI}>AI에게 묻기</button>
          <Link to={`/query?scope=current-note&noteId=${post.id}&q=${encodeURIComponent(`${post.title}와 연결되는 관련 문서를 찾아줘`)}`} className="related-button">
            관련 문서
          </Link>
          <Link to={`/notes/edit/${post.id}`} className="edit-button">수정</Link>
          <div className="blog-more-menu" ref={menuRef}>
            <button
              type="button"
              className="more-button"
              aria-expanded={menuOpen}
              aria-label="추가 작업"
              onClick={() => setMenuOpen((open) => !open)}
            >
              ⋯
            </button>
            {menuOpen ? (
              <div className="blog-more-popover" role="menu">
                <button type="button" className="blog-more-item" role="menuitem" onClick={handleDelete}>삭제</button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <article className="blog-article">
        <header className="blog-header">
          <h1>{post.title}</h1>
          <div className="blog-meta">
            <span className="visibility-badge">{getVisibilityLabel(post.visibility)}</span>
            <span className="blog-date">작성일: {formatDate(post.createdAt)}</span>
            <span className="blog-read-time">· {estimateReadTime(post.content)}분 읽기</span>
          </div>
        </header>

        <div className="blog-content markdown-body">
          <RichMarkdown>{post.content}</RichMarkdown>
        </div>
      </article>
    </div>
  )
}

export default BlogDetailPage
