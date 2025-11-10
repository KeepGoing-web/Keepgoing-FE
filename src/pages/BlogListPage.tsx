import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './BlogListPage.css'

interface BlogPost {
  id: string
  title: string
  content: string
  createdAt: string
  visibility: 'PUBLIC' | 'PRIVATE' | 'AI_COLLECTABLE'
  aiCollectable: boolean
}

const BlogListPage = () => {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: API 호출로 블로그 목록 가져오기
    // 임시 데이터
    const mockPosts: BlogPost[] = [
      {
        id: '1',
        title: '첫 번째 포스트',
        content: '이것은 첫 번째 포스트입니다...',
        createdAt: '2024-01-01',
        visibility: 'PUBLIC',
        aiCollectable: true,
      },
    ]
    setPosts(mockPosts)
    setLoading(false)
  }, [])

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

  return (
    <div className="blog-list-page">
      <div className="page-header">
        <h1>블로그</h1>
        <Link to="/blogs/write" className="write-button">
          새 포스트 작성
        </Link>
      </div>
      <div className="blog-list">
        {posts.length === 0 ? (
          <div className="empty-state">
            <p>아직 작성한 포스트가 없습니다.</p>
            <Link to="/blogs/write" className="write-button">
              첫 포스트 작성하기
            </Link>
          </div>
        ) : (
          posts.map((post) => (
            <Link
              key={post.id}
              to={`/blogs/${post.id}`}
              className="blog-card"
            >
              <div className="blog-card-header">
                <h2>{post.title}</h2>
                <div className="blog-meta">
                  <span className="visibility-badge">
                    {getVisibilityLabel(post.visibility)}
                  </span>
                  {post.aiCollectable && (
                    <span className="ai-badge">AI 수집 가능</span>
                  )}
                </div>
              </div>
              <p className="blog-preview">{post.content}</p>
              <div className="blog-date">
                {new Date(post.createdAt).toLocaleDateString('ko-KR')}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

export default BlogListPage

