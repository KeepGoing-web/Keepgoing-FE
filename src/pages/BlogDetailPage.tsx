import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import './BlogDetailPage.css'

interface BlogPost {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  visibility: 'PUBLIC' | 'PRIVATE' | 'AI_COLLECTABLE'
  aiCollectable: boolean
}

const BlogDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: API 호출로 블로그 상세 정보 가져오기
    if (id) {
      const mockPost: BlogPost = {
        id,
        title: '첫 번째 포스트',
        content: '이것은 첫 번째 포스트의 전체 내용입니다...',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        visibility: 'PUBLIC',
        aiCollectable: true,
      }
      setPost(mockPost)
      setLoading(false)
    }
  }, [id])

  const getVisibilityLabel = (visibility: string) => {
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
            <span className="blog-date">
              작성일: {new Date(post.createdAt).toLocaleDateString('ko-KR')}
            </span>
          </div>
        </header>
        <div className="blog-content">{post.content}</div>
      </article>
    </div>
  )
}

export default BlogDetailPage

