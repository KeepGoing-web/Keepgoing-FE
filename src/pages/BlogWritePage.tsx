import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './BlogWritePage.css'

interface BlogPost {
  title: string
  content: string
  visibility: 'PUBLIC' | 'PRIVATE' | 'AI_COLLECTABLE'
  aiCollectable: boolean
}

const BlogWritePage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id
  const [formData, setFormData] = useState<BlogPost>({
    title: '',
    content: '',
    visibility: 'PUBLIC',
    aiCollectable: false,
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isEdit) {
      // TODO: API 호출로 기존 포스트 정보 가져오기
      setFormData({
        title: '첫 번째 포스트',
        content: '이것은 첫 번째 포스트입니다...',
        visibility: 'PUBLIC',
        aiCollectable: true,
      })
    }
  }, [id, isEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // TODO: API 호출로 포스트 저장/수정
      await new Promise((resolve) => setTimeout(resolve, 1000))
      navigate('/blogs')
    } catch (error) {
      console.error('저장 실패:', error)
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="blog-write-page">
      <h1>{isEdit ? '포스트 수정' : '새 포스트 작성'}</h1>
      <form onSubmit={handleSubmit} className="blog-form">
        <div className="form-group">
          <label htmlFor="title">제목</label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            required
            placeholder="포스트 제목을 입력하세요"
          />
        </div>
        <div className="form-group">
          <label htmlFor="content">내용</label>
          <textarea
            id="content"
            value={formData.content}
            onChange={(e) =>
              setFormData({ ...formData, content: e.target.value })
            }
            required
            placeholder="포스트 내용을 입력하세요"
            rows={20}
          />
        </div>
        <div className="form-group">
          <label htmlFor="visibility">공개 설정</label>
          <select
            id="visibility"
            value={formData.visibility}
            onChange={(e) =>
              setFormData({
                ...formData,
                visibility: e.target.value as BlogPost['visibility'],
              })
            }
          >
            <option value="PUBLIC">공개</option>
            <option value="PRIVATE">비공개</option>
            <option value="AI_COLLECTABLE">AI 수집 가능</option>
          </select>
        </div>
        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={formData.aiCollectable}
              onChange={(e) =>
                setFormData({ ...formData, aiCollectable: e.target.checked })
              }
            />
            AI 수집 허용
          </label>
          <p className="help-text">
            이 옵션을 활성화하면 AI가 이 포스트를 수집하여 RAG 시스템에
            활용할 수 있습니다.
          </p>
        </div>
        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/blogs')}
            className="cancel-button"
          >
            취소
          </button>
          <button type="submit" className="save-button" disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default BlogWritePage

