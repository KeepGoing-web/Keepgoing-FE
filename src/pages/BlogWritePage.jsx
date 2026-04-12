import { lazy, Suspense, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { useToast } from '../contexts/ToastContext'
import { useVaultOptional } from '../contexts/VaultContext'
import { useConfirm } from '../components/ConfirmModal'
import LoadingDots from '../components/LoadingDots'
import PageLoader from '../components/PageLoader'
import MermaidCodeBlock from '../components/MermaidCodeBlock'
import { estimateReadTime, countChars } from '../utils/format'
import { fetchNote, createNote, updateNote } from '../api/client'
import '../styles/hljs-theme.css'
import '../components/MarkdownBody.css'
import './BlogWritePage.css'

const TiptapEditor = lazy(() => import('../components/TiptapEditor'))

const BLOG_LIST_PATH = '/notes/list'
const MOBILE_BREAKPOINT = 768

const BlogWritePage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const vault = useVaultOptional()
  const confirm = useConfirm()
  const isEdit = Boolean(id)
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.innerWidth <= MOBILE_BREAKPOINT)

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    visibility: 'PUBLIC',
    aiCollectable: false,
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [error, setError] = useState(null)
  const [metaOpen, setMetaOpen] = useState(() => window.innerWidth > MOBILE_BREAKPOINT)
  const [previewOpen, setPreviewOpen] = useState(false)
  const showMetaPanel = !isMobileViewport || metaOpen

  useEffect(() => {
    const handleResize = () => {
      const nextIsMobile = window.innerWidth <= MOBILE_BREAKPOINT
      setIsMobileViewport(nextIsMobile)
      if (!nextIsMobile) {
        setMetaOpen(true)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
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
      }

      const savedNote = isEdit
        ? await updateNote(id, payload)
        : await createNote(payload)

      await vault?.refreshNotes?.()
      setIsDirty(false)
      toast.success(isEdit ? '노트가 수정되었습니다.' : '노트가 저장되었습니다.')
      navigate(`/notes/${savedNote?.id ?? id}`)
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

  const visibilityLabel = visibilityOptions.find((option) => option.value === formData.visibility)?.label || '공개'

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
      {isMobileViewport && showMetaPanel && (
        <button
          type="button"
          className="bw-meta-backdrop"
          aria-label="설정 패널 닫기"
          onClick={() => setMetaOpen(false)}
        />
      )}

      {previewOpen && isMobileViewport && (
        <button
          type="button"
          className="bw-preview-backdrop"
          aria-label="미리보기 닫기"
          onClick={() => setPreviewOpen(false)}
        />
      )}

      <header className="bw-header">
        <div className="bw-header-left">
          <button type="button" className="bw-btn bw-btn--ghost" onClick={handleBack} aria-label="목록으로 돌아가기">
            목록
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
            <span className="bw-vis-label">AI 수집</span>
          </button>

          <button
            type="button"
            className={`bw-btn bw-btn--ghost bw-preview-toggle ${previewOpen ? 'active' : ''}`}
            onClick={() => setPreviewOpen((open) => !open)}
            aria-expanded={previewOpen}
            aria-controls="note-preview-panel"
          >
            미리보기
          </button>

          <button
            type="button"
            className={`bw-btn bw-btn--ghost bw-meta-toggle ${metaOpen ? 'active' : ''}`}
            onClick={() => setMetaOpen((open) => !open)}
            aria-expanded={showMetaPanel}
            title="문서 인스펙터"
          >
설정
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
          <div className="bw-workspace">
            <section className="bw-editor-pane" aria-label="노트 작성 영역">
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
            </section>

            {previewOpen && (
              <aside id="note-preview-panel" className={`bw-preview-panel${isMobileViewport ? ' bw-preview-panel--mobile' : ''}`} aria-label="노트 미리보기">
                <div className="bw-preview-header">
                  <strong>노트 미리보기</strong>
                  <button type="button" className="bw-btn bw-btn--ghost bw-preview-close" onClick={() => setPreviewOpen(false)}>
                    닫기
                  </button>
                </div>

                <div className="bw-preview-scroll">
                  <article className="bw-preview-article">
                    <header className="bw-preview-article-header">
                      <h1>{formData.title.trim() || '제목 없는 노트'}</h1>
                      <div className="bw-preview-meta">
                        <span className="bw-preview-badge">{visibilityLabel}</span>
                        {formData.aiCollectable && <span className="bw-preview-badge bw-preview-badge--ai">AI 수집 허용</span>}
                        <span className="bw-preview-meta-text">{countChars(formData.content)}자</span>
                        <span className="bw-preview-meta-text">· {estimateReadTime(formData.content)}분 읽기</span>
                      </div>
                    </header>

                    <div className="bw-preview-divider" role="separator" />

                    <div className="bw-preview-body markdown-body">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{ code: MermaidCodeBlock }}
                      >
                        {formData.content || ' '}
                      </ReactMarkdown>
                    </div>
                  </article>
                </div>
              </aside>
            )}
          </div>
        </div>

        <aside className={`bw-meta-panel ${showMetaPanel ? 'open' : ''}`} aria-hidden={!showMetaPanel}>
          <div className="bw-inspector-overview">
            <span className="bw-inspector-kicker">노트 정보</span>
            <strong className="bw-inspector-title">{formData.title.trim() || (isEdit ? '제목 없는 노트' : '새 노트')}</strong>
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
            <div className="bw-meta-stat">
              <span>공개 범위</span>
              <strong>{visibilityLabel}</strong>
            </div>
          </div>
        </aside>
      </div>

      <div className="bw-status-bar">
        <span className={saving ? 'bw-status-dirty' : isDirty ? 'bw-status-dirty' : 'bw-status-saved'}>
          {saving ? '저장 중…' : isDirty ? '작성 중' : isEdit ? '저장됨' : '새 노트'}
        </span>
        <span>{countChars(formData.content)}자</span>
        <span>{estimateReadTime(formData.content)}분 읽기</span>
        {isMobileViewport && (
          <button
            type="button"
            className="bw-status-meta-btn"
            onClick={() => setMetaOpen((open) => !open)}
          >
            {showMetaPanel ? '인스펙터 닫기' : '인스펙터 열기'}
          </button>
        )}
      </div>
    </div>
  )
}

export default BlogWritePage
