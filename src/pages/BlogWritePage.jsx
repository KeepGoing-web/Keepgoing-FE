import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { useVaultOptional } from '../contexts/VaultContext'
import { useConfirm } from '../components/ConfirmModal'
import LoadingDots from '../components/LoadingDots'
import PageLoader from '../components/PageLoader'
import { estimateReadTime, countChars } from '../utils/format'
import {
  fetchNote,
  createNote,
  updateNote,
  fetchCategories,
  fetchTags,
  createTag,
  createCategory as apiCreateCategory,
} from '../api/client'
import './BlogWritePage.css'

const TiptapEditor = lazy(() => import('../components/TiptapEditor'))

const BLOG_LIST_PATH = '/notes/list'

const BlogWritePage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const vault = useVaultOptional()
  const confirm = useConfirm()
  const isEdit = Boolean(id)

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
  const [isDirty, setIsDirty] = useState(false)
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  const [error, setError] = useState(null)
  const [metaOpen, setMetaOpen] = useState(false)
  const [newTagInput, setNewTagInput] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newCatInput, setNewCatInput] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  const newTagRef = useRef(null)
  const newCatRef = useRef(null)

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [categoryResponse, tagResponse] = await Promise.all([fetchCategories(), fetchTags()])
        setCategories(categoryResponse.categories || [])
        setTags(tagResponse.tags || [])
      } catch {
        // ignore
      }
    }

    void loadMeta()
  }, [])

  useEffect(() => {
    const loadPost = async () => {
      if (!isEdit) return

      setLoading(true)
      setError(null)

      try {
        const response = await fetchNote(id)
        setFormData({
          title: response.title || '',
          content: response.content || '',
          visibility: response.visibility || 'PUBLIC',
          aiCollectable: Boolean(response.aiCollectable),
          categoryId: response.category?.id || '',
          tagIds: Array.isArray(response.tags) ? response.tags.map((tag) => tag.id) : [],
        })
      } catch {
        setError('노트를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    void loadPost()
  }, [id, isEdit])

  useEffect(() => {
    if (!isDirty) return undefined

    const handleBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const handleFormChange = (updates) => {
    setFormData((prev) => ({ ...prev, ...updates }))
    setIsDirty(true)
  }

  const handleNewTagOpen = () => {
    setNewTagName('')
    setNewTagInput(true)
    setTimeout(() => newTagRef.current?.focus(), 0)
  }

  const handleNewTagCommit = async () => {
    const name = newTagName.trim()
    if (!name) {
      setNewTagInput(false)
      return
    }

    try {
      const response = await createTag(name)
      const createdTag = response.tag || response
      setTags((prev) => [...prev, createdTag])
      handleFormChange({ tagIds: [...formData.tagIds, createdTag.id] })
    } catch {
      // ignore duplicate creation errors
    }

    setNewTagInput(false)
    setNewTagName('')
  }

  const handleNewTagKey = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleNewTagCommit()
    }
    if (event.key === 'Escape') {
      setNewTagInput(false)
      setNewTagName('')
    }
  }

  const handleNewCatOpen = () => {
    setNewCatName('')
    setNewCatInput(true)
    setTimeout(() => newCatRef.current?.focus(), 0)
  }

  const handleNewCatCommit = async () => {
    const name = newCatName.trim()
    if (!name) {
      setNewCatInput(false)
      return
    }

    try {
      const response = await apiCreateCategory(name)
      const createdCategory = response.category || response
      setCategories((prev) => [...prev, createdCategory])
      handleFormChange({ categoryId: createdCategory.id })
    } catch {
      // ignore category creation errors for now
    }

    setNewCatInput(false)
    setNewCatName('')
  }

  const handleNewCatKey = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      void handleNewCatCommit()
    }
    if (event.key === 'Escape') {
      setNewCatInput(false)
      setNewCatName('')
    }
  }

  const handleSubmit = async (event) => {
    if (event) event.preventDefault()
    if (!formData.title.trim()) return

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
        await updateNote(id, payload)
      } else {
        await createNote(payload)
      }

      await vault?.refreshNotes?.()
      setIsDirty(false)
      toast.success(isEdit ? '노트가 수정되었습니다.' : '노트가 저장되었습니다.')
      navigate(BLOG_LIST_PATH)
    } catch {
      toast.error('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleBack = async () => {
    if (isDirty) {
      const ok = await confirm('저장하지 않은 변경사항이 있습니다. 나가시겠습니까?', {
        title: '변경사항 확인',
        confirmLabel: '나가기',
        cancelLabel: '계속 작성',
      })
      if (!ok) return
    }

    navigate(BLOG_LIST_PATH)
  }

  const visibilityOptions = [
    { value: 'PUBLIC', label: '공개', icon: '🌐' },
    { value: 'PRIVATE', label: '비공개', icon: '🔒' },
  ]

  if (loading) {
    return (
      <div className="bw-loading">
        <LoadingDots />
      </div>
    )
  }

  if (error) {
    return <div className="bw-page">{error}</div>
  }

  return (
    <div className="bw-page">
      <header className="bw-header">
        <div className="bw-header-left">
          <button type="button" className="bw-btn bw-btn--ghost" onClick={handleBack} aria-label="목록으로 돌아가기">
            ← 돌아가기
          </button>
          <span className="bw-header-title">{isEdit ? '노트 수정' : '새 노트'}</span>
        </div>

        <div className="bw-header-right">
          <div className="bw-visibility-select">
            {visibilityOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`bw-vis-btn ${formData.visibility === option.value ? 'active' : ''}`}
                onClick={() => handleFormChange({ visibility: option.value })}
                title={option.label}
                aria-pressed={formData.visibility === option.value}
              >
                <span className="bw-vis-icon">{option.icon}</span>
                <span className="bw-vis-label">{option.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`bw-btn bw-btn--ghost bw-ai-toggle ${formData.aiCollectable ? 'active' : ''}`}
            onClick={() => handleFormChange({ aiCollectable: !formData.aiCollectable })}
            title={formData.aiCollectable ? 'AI 수집 허용됨' : 'AI 수집 미허용'}
            aria-pressed={formData.aiCollectable}
          >
            <span className="bw-vis-icon">🤖</span>
            <span className="bw-vis-label">AI 수집</span>
          </button>

          <button
            type="button"
            className={`bw-btn bw-btn--ghost bw-meta-toggle ${metaOpen ? 'active' : ''}`}
            onClick={() => setMetaOpen((open) => !open)}
            aria-expanded={metaOpen}
            title="메타데이터 패널"
          >
            ⚙ 설정
          </button>

          <button type="button" className="bw-btn bw-btn--ghost" onClick={handleBack}>
            취소
          </button>
          <button type="button" className="bw-btn bw-btn--primary" onClick={handleSubmit} disabled={saving || !formData.title.trim()}>
            {saving ? '저장 중...' : isEdit ? '수정' : '저장'}
          </button>
        </div>
      </header>

      <div className="bw-body">
        <div className="bw-main">
          <input
            className="bw-title-input"
            value={formData.title}
            onChange={(event) => handleFormChange({ title: event.target.value })}
            placeholder="제목을 입력하세요"
            aria-label="노트 제목"
          />

          <div className="bw-editor-wrap">
            <Suspense fallback={<PageLoader label="에디터를 불러오는 중..." />}>
              <TiptapEditor value={formData.content} onChange={(content) => handleFormChange({ content })} />
            </Suspense>
          </div>
        </div>

        <aside className={`bw-meta-panel ${metaOpen ? 'open' : ''}`}>
          <div className="bw-meta-group">
            <label className="bw-meta-label">카테고리</label>
            <div className="bw-meta-row">
              <select value={formData.categoryId} onChange={(event) => handleFormChange({ categoryId: event.target.value })}>
                <option value="">카테고리 선택</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <button type="button" className="bw-btn bw-btn--ghost" onClick={handleNewCatOpen}>
                +
              </button>
            </div>
            {newCatInput && (
              <input
                ref={newCatRef}
                className="bw-inline-input"
                value={newCatName}
                onChange={(event) => setNewCatName(event.target.value)}
                onBlur={() => void handleNewCatCommit()}
                onKeyDown={handleNewCatKey}
                placeholder="새 카테고리"
              />
            )}
          </div>

          <div className="bw-meta-group">
            <label className="bw-meta-label">태그</label>
            <div className="bw-tag-list">
              {tags.map((tag) => {
                const selected = formData.tagIds.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={`bw-tag ${selected ? 'active' : ''}`}
                    onClick={() =>
                      handleFormChange({
                        tagIds: selected
                          ? formData.tagIds.filter((tagId) => tagId !== tag.id)
                          : [...formData.tagIds, tag.id],
                      })
                    }
                  >
                    #{tag.name}
                  </button>
                )
              })}
              <button type="button" className="bw-tag bw-tag--new" onClick={handleNewTagOpen}>
                + 새 태그
              </button>
            </div>
            {newTagInput && (
              <input
                ref={newTagRef}
                className="bw-inline-input"
                value={newTagName}
                onChange={(event) => setNewTagName(event.target.value)}
                onBlur={() => void handleNewTagCommit()}
                onKeyDown={handleNewTagKey}
                placeholder="새 태그"
              />
            )}
          </div>

          <div className="bw-meta-group bw-meta-group--stats">
            <div className="bw-meta-stat">
              <span>글자 수</span>
              <strong>{countChars(formData.content)}</strong>
            </div>
            <div className="bw-meta-stat">
              <span>예상 읽기 시간</span>
              <strong>{estimateReadTime(formData.content)}분</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default BlogWritePage
