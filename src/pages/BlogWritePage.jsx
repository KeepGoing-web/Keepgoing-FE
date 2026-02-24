import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../components/ConfirmModal'
import TiptapEditor from '../components/TiptapEditor'
import LoadingDots from '../components/LoadingDots'
import { estimateReadTime, countChars } from '../utils/format'
import './BlogWritePage.css'
import {
  fetchBlog,
  createBlog,
  updateBlog,
  fetchCategories,
  fetchTags,
  createTag,
  createCategory as apiCreateCategory,
} from '../api/client'

const BlogWritePage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const isEdit = !!id

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    visibility: 'PUBLIC',
    aiCollectable: false,
    categoryId: '',
    tagIds: [],
  })
  const [loading, setLoading]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [isDirty, setIsDirty]     = useState(false)
  const [categories, setCategories] = useState([])
  const [tags, setTags]           = useState([])
  const [error, setError]         = useState(null)
  const [metaOpen, setMetaOpen]   = useState(false)

  // Inline tag creation state
  const [newTagInput, setNewTagInput] = useState(false)
  const [newTagName, setNewTagName]   = useState('')
  const newTagRef = useRef(null)

  // Inline category creation state
  const [newCatInput, setNewCatInput] = useState(false)
  const [newCatName, setNewCatName]   = useState('')
  const newCatRef = useRef(null)

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [catRes, tagRes] = await Promise.all([fetchCategories(), fetchTags()])
        setCategories(catRes.categories || [])
        setTags(tagRes.tags || [])
      } catch {
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
          title:         res.title || '',
          content:       res.content || '',
          visibility:    res.visibility || 'PUBLIC',
          aiCollectable: !!res.aiCollectable,
          categoryId:    res.category?.id || '',
          tagIds:        Array.isArray(res.tags) ? res.tags.map((t) => t.id) : [],
        })
      } catch {
        setError('포스트를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, isEdit])

  /* Track dirty state for unsaved changes warning */
  const handleFormChange = (updates) => {
    setFormData((prev) => ({ ...prev, ...updates }))
    setIsDirty(true)
  }

  /* Warn before leaving with unsaved changes */
  useEffect(() => {
    if (!isDirty) return
    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  /* ── Inline tag creation ─────────────────────────────────── */
  const handleNewTagOpen = () => {
    setNewTagName('')
    setNewTagInput(true)
    setTimeout(() => newTagRef.current?.focus(), 0)
  }

  const handleNewTagCommit = async () => {
    const name = newTagName.trim()
    if (!name) { setNewTagInput(false); return }
    try {
      const res = await createTag(name)
      const created = res.tag || res
      setTags((prev) => [...prev, created])
      handleFormChange({ tagIds: [...formData.tagIds, created.id] })
    } catch {
      // ignore – tag may already exist
    }
    setNewTagInput(false)
    setNewTagName('')
  }

  const handleNewTagKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleNewTagCommit() }
    if (e.key === 'Escape') { setNewTagInput(false); setNewTagName('') }
  }

  /* ── Inline category creation ────────────────────────────── */
  const handleNewCatOpen = () => {
    setNewCatName('')
    setNewCatInput(true)
    setTimeout(() => newCatRef.current?.focus(), 0)
  }

  const handleNewCatCommit = async () => {
    const name = newCatName.trim()
    if (!name) { setNewCatInput(false); return }
    try {
      const res = await apiCreateCategory(name)
      const created = res.category || res
      setCategories((prev) => [...prev, created])
      handleFormChange({ categoryId: created.id })
    } catch {
      // ignore
    }
    setNewCatInput(false)
    setNewCatName('')
  }

  const handleNewCatKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleNewCatCommit() }
    if (e.key === 'Escape') { setNewCatInput(false); setNewCatName('') }
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!formData.title.trim()) return
    setSaving(true)
    try {
      const payload = {
        title:         formData.title,
        content:       formData.content,
        visibility:    formData.visibility,
        aiCollectable: formData.aiCollectable,
        categoryId:    formData.categoryId || undefined,
        tagIds:        formData.tagIds || [],
      }
      if (isEdit) {
        await updateBlog(id, payload)
      } else {
        await createBlog(payload)
      }
      setIsDirty(false)
      toast.success(isEdit ? '포스트가 수정되었습니다.' : '포스트가 저장되었습니다.')
      navigate('/blogs')
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
    navigate('/blogs')
  }

  const visibilityOptions = [
    { value: 'PUBLIC',  label: '공개',   icon: '🌐' },
    { value: 'PRIVATE', label: '비공개', icon: '🔒' },
  ]

  if (loading) {
    return (
      <div className="bw-loading">
        <LoadingDots />
      </div>
    )
  }

  return (
    <div className="bw-page">
      {/* ── Top header bar ────────────────────────────────── */}
      <header className="bw-header">
        <div className="bw-header-left">
          <button
            type="button"
            className="bw-btn bw-btn--ghost"
            onClick={handleBack}
            aria-label="목록으로 돌아가기"
          >
            ← 돌아가기
          </button>
          <span className="bw-header-title">
            {isEdit ? '포스트 수정' : '새 포스트'}
          </span>
        </div>

        <div className="bw-header-right">
          {/* Visibility quick-select */}
          <div className="bw-visibility-select">
            {visibilityOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`bw-vis-btn ${formData.visibility === opt.value ? 'active' : ''}`}
                onClick={() => handleFormChange({ visibility: opt.value })}
                title={opt.label}
                aria-pressed={formData.visibility === opt.value}
              >
                <span className="bw-vis-icon">{opt.icon}</span>
                <span className="bw-vis-label">{opt.label}</span>
              </button>
            ))}
          </div>

          {/* AI collectable toggle */}
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

          {/* Meta toggle */}
          <button
            type="button"
            className={`bw-btn bw-btn--ghost bw-meta-toggle ${metaOpen ? 'active' : ''}`}
            onClick={() => setMetaOpen((v) => !v)}
            aria-expanded={metaOpen}
            title="메타데이터 패널"
          >
            ⚙ 설정
          </button>

          <button
            type="button"
            className="bw-btn bw-btn--ghost"
            onClick={handleBack}
          >
            취소
          </button>
          <button
            type="button"
            className="bw-btn bw-btn--primary"
            onClick={handleSubmit}
            disabled={saving || !formData.title.trim()}
            aria-busy={saving}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </header>

      {error && (
        <div className="bw-error" role="alert">{error}</div>
      )}

      {/* ── Body: editor + optional side meta ─────────────── */}
      <div className="bw-body">
        {/* Main editor column */}
        <div className="bw-editor-column">
          {/* Title */}
          <input
            className="bw-title-input"
            type="text"
            value={formData.title}
            onChange={(e) => handleFormChange({ title: e.target.value })}
            placeholder="제목을 입력하세요"
            aria-label="포스트 제목"
            maxLength={200}
          />

          {/* Markdown editor */}
          <div className="bw-editor-wrap">
            <TiptapEditor
              value={formData.content}
              onChange={(val) => handleFormChange({ content: val })}
              placeholder="마크다운으로 내용을 작성하세요..."
            />
          </div>

          {/* Status bar */}
          <div className="bw-status-bar">
            <span>{countChars(formData.content).toLocaleString()}자</span>
            <span>약 {estimateReadTime(formData.content)}분 읽기</span>
            <span className={isDirty ? 'bw-status-dirty' : 'bw-status-saved'}>
              {isDirty ? '변경됨' : '저장됨'}
            </span>
          </div>
        </div>

        {/* Side meta panel */}
        {metaOpen && (
          <aside className="bw-meta-panel" aria-label="포스트 설정">
            <div className="bw-meta-section">
              <h3 className="bw-meta-heading">카테고리</h3>
              <select
                className="bw-meta-select"
                value={formData.categoryId}
                onChange={(e) => handleFormChange({ categoryId: e.target.value })}
                aria-label="카테고리 선택"
              >
                <option value="">선택 안 함</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {newCatInput ? (
                <input
                  ref={newCatRef}
                  className="bw-inline-input"
                  type="text"
                  placeholder="카테고리 이름"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={handleNewCatKey}
                  onBlur={() => { setNewCatInput(false); setNewCatName('') }}
                />
              ) : (
                <button
                  type="button"
                  className="bw-new-cat-btn"
                  onClick={handleNewCatOpen}
                >
                  + 새 카테고리
                </button>
              )}
            </div>

            <div className="bw-meta-section">
              <h3 className="bw-meta-heading">태그</h3>
              <div className="bw-tag-list">
                {tags.map((t) => {
                  const active = formData.tagIds.includes(t.id)
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`bw-tag-chip ${active ? 'active' : ''}`}
                      onClick={() => {
                        const next = active
                          ? formData.tagIds.filter((x) => x !== t.id)
                          : [...formData.tagIds, t.id]
                        handleFormChange({ tagIds: next })
                      }}
                      aria-pressed={active}
                    >
                      #{t.name}
                    </button>
                  )
                })}
              </div>
              {newTagInput ? (
                <input
                  ref={newTagRef}
                  className="bw-inline-input"
                  type="text"
                  placeholder="태그 이름"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={handleNewTagKey}
                  onBlur={() => { setNewTagInput(false); setNewTagName('') }}
                />
              ) : (
                <button
                  type="button"
                  className="bw-new-tag-btn"
                  onClick={handleNewTagOpen}
                >
                  + 새 태그
                </button>
              )}
            </div>

            <div className="bw-meta-section">
              <h3 className="bw-meta-heading">AI 설정</h3>
              <label className="bw-meta-toggle-row">
                <div className="bw-toggle-switch">
                  <input
                    type="checkbox"
                    checked={formData.aiCollectable}
                    onChange={(e) => handleFormChange({ aiCollectable: e.target.checked })}
                    aria-label="AI 수집 허용"
                  />
                  <span className="bw-toggle-track" />
                </div>
                <div className="bw-toggle-label">
                  <span className="bw-toggle-title">AI 수집 허용</span>
                  <span className="bw-toggle-desc">RAG 시스템에서 이 포스트를 참조합니다.</span>
                </div>
              </label>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

export default BlogWritePage
