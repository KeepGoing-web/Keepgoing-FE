import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import '../styles/hljs-theme.css'
import './BlogDetailPage.css'
import '../components/MarkdownBody.css'
import { fetchBlog, deleteBlog } from '../api/client'
import MermaidCodeBlock from '../components/MermaidCodeBlock'
import { useVaultOptional } from '../contexts/VaultContext'
import { formatDate, estimateReadTime } from '../utils/format'
import ReadingProgressBar from '../components/ReadingProgressBar'
import { useConfirm } from '../components/ConfirmModal'
import { useToast } from '../contexts/ToastContext'

const BlogDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()

  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  /* VaultContext may not exist if accessed outside VaultLayout */
  const vault = useVaultOptional()
  const addRecentPost = vault?.addRecentPost ?? null
  const allPosts = vault?.allPosts ?? []

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetchBlog(id)
        setPost(res)
        if (addRecentPost && res) addRecentPost(res)
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
    load()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

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
    const ok = await confirm('이 포스트를 삭제하시겠습니까?', {
      title: '포스트 삭제',
      confirmLabel: '삭제',
      cancelLabel: '취소',
    })
    if (!ok) return
    try {
      await deleteBlog(post.id)
      toast.success('포스트가 삭제되었습니다.')
      navigate('/blogs')
    } catch {
      toast.error('삭제에 실패했습니다.')
    }
  }

  /* C4: related posts — same category OR at least one common tag */
  const relatedPosts = post
    ? allPosts
        .filter((p) => {
          if (String(p.id) === String(post.id)) return false
          const sameCat =
            post.category &&
            p.category &&
            String(p.category.id) === String(post.category.id)
          const postTagIds = new Set((post.tags || []).map((t) => String(t.id)))
          const commonTag = (p.tags || []).some((t) => postTagIds.has(String(t.id)))
          return sameCat || commonTag
        })
        .slice(0, 3)
    : []

  if (loading) {
    return <div className="loading">로딩 중...</div>
  }

  if (!post) {
    return <div className="error">포스트를 찾을 수 없습니다.</div>
  }

  /* C5: breadcrumb segments */
  const categoryName = post.category?.name || '미분류'
  const truncatedTitle =
    post.title.length > 30 ? post.title.slice(0, 30) + '…' : post.title

  return (
    <div className="blog-detail-page">
      {/* C1: reading progress bar */}
      <ReadingProgressBar />

      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="blog-actions">
        {/* C5: breadcrumb */}
        <nav className="breadcrumb" aria-label="breadcrumb">
          <Link to="/blogs" className="breadcrumb-link">대시보드</Link>
          <span className="breadcrumb-sep">/</span>
          <Link to={`/blogs?category=${post.category?.id ?? ''}`} className="breadcrumb-link">
            {categoryName}
          </Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current" title={post.title}>{truncatedTitle}</span>
        </nav>

        <div className="blog-actions-right">
          <Link to={`/blogs/edit/${post.id}`} className="edit-button">
            수정
          </Link>
          <button className="delete-button" onClick={handleDelete}>
            삭제
          </button>
        </div>
      </div>

      <article className="blog-article">
        <header className="blog-header">
          <h1>{post.title}</h1>
          <div className="blog-meta">
            <span className="visibility-badge">
              {getVisibilityLabel(post.visibility)}
            </span>
            {post.aiCollectable && (
              <span className="ai-badge">AI 수집 가능</span>
            )}
            {post.category && (
              <span className="category-badge" style={{ marginLeft: 8 }}>
                #{post.category.name}
              </span>
            )}
            {/* C2: date + read time */}
            <span className="blog-date">
              작성일: {formatDate(post.createdAt)}
            </span>
            <span className="blog-read-time">
              · {estimateReadTime(post.content)}분 읽기
            </span>
          </div>
        </header>
        {Array.isArray(post.tags) && post.tags.length > 0 && (
          <div className="tag-list" style={{ marginBottom: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {post.tags.map((t) => (
              <span key={t.id} className="tag-badge">#{t.name}</span>
            ))}
          </div>
        )}
        <div className="blog-content markdown-body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{ code: MermaidCodeBlock }}
          >
            {post.content}
          </ReactMarkdown>
        </div>
      </article>

      {/* C4: related posts */}
      {relatedPosts.length > 0 && (
        <section className="related-posts">
          <h2 className="related-posts-title">관련 포스트</h2>
          <div className="related-posts-list">
            {relatedPosts.map((p) => (
              <Link
                key={p.id}
                to={`/blogs/${p.id}`}
                className="related-post-item"
              >
                <span className="related-post-title">{p.title}</span>
                <div className="related-post-meta">
                  {p.category && (
                    <span className="related-post-category">#{p.category.name}</span>
                  )}
                  <span className="related-post-date">{formatDate(p.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default BlogDetailPage
