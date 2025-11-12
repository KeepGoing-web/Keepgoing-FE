import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './BlogWritePage.css'
import {
  fetchBlog,
  createBlog,
  updateBlog,
  fetchCategories,
  fetchTags,
} from '../api/client'

const BlogWritePage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    visibility: 'PUBLIC',
    aiCollectable: false,
    categoryId: '',
    tagIds: [],
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [catRes, tagRes] = await Promise.all([
          fetchCategories(),
          fetchTags(),
        ])
        setCategories(catRes.categories || [])
        setTags(tagRes.tags || [])
      } catch (e) {
        // ignore
      }
    }
    loadMeta()
  }, [])

  useEffect(() => {
    const load = async () => {
      if (!isEdit) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetchBlog(id)
        setFormData({
          title: res.title || '',
          content: res.content || '',
          visibility: res.visibility || 'PUBLIC',
          aiCollectable: !!res.aiCollectable,
          categoryId: res.category?.id || '',
          tagIds: Array.isArray(res.tags) ? res.tags.map((t) => t.id) : [],
        })
      } catch (e) {
        setError('포스트를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, isEdit])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        title: formData.title,
        content: formData.content,
        visibility: formData.visibility,
        aiCollectable: formData.aiCollectable,
        categoryId: formData.categoryId || undefined,
        tagIds: formData.tagIds || [],
      }
      if (isEdit) {
        await updateBlog(id, payload)
      } else {
        await createBlog(payload)
      }
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
      {loading && <div className="loading">불러오는 중...</div>}
      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}
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
                visibility: e.target.value,
              })
            }
          >
            <option value="PUBLIC">공개</option>
            <option value="PRIVATE">비공개</option>
            <option value="AI_COLLECTABLE">AI 수집 가능</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="category">카테고리</label>
          <select
            id="category"
            value={formData.categoryId}
            onChange={(e) =>
              setFormData({
                ...formData,
                categoryId: e.target.value,
              })
            }
          >
            <option value="">선택 안 함</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="tags">태그</label>
          <select
            id="tags"
            multiple
            value={formData.tagIds}
            onChange={(e) => {
              const options = Array.from(e.target.selectedOptions).map(
                (o) => o.value
              )
              setFormData({
                ...formData,
                tagIds: options,
              })
            }}
          >
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <p className="help-text">Ctrl/Command를 누른 채 다중 선택이 가능합니다.</p>
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

