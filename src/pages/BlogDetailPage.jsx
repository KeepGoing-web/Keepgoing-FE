import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import './BlogDetailPage.css'
import { fetchBlog } from '../api/client'

const BlogDetailPage = () => {
  const { id } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetchBlog(id)
        setPost(res)
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
  }, [id])

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

  if (loading) {
    return <div className="loading">로딩 중...</div>
  }

  if (!post) {
    return <div className="error">포스트를 찾을 수 없습니다.</div>
  }

  return (
    <div className="blog-detail-page">
      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="blog-actions">
        <Link to="/blogs" className="back-button">
          ← 목록으로
        </Link>
        <Link to={`/blogs/edit/${post.id}`} className="edit-button">
          수정
        </Link>
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
            <span className="blog-date">
              작성일: {new Date(post.createdAt).toLocaleDateString('ko-KR')}
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
        <div className="blog-content">{post.content}</div>
      </article>
    </div>
  )
}

export default BlogDetailPage

