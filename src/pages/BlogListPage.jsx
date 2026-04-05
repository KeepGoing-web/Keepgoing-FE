import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { fetchNotes } from '../api/client'
import { useVault } from '../contexts/VaultContext'
import { useDebounce } from '../hooks/useDebounce'
import { buildNoteListParams, DEFAULT_NOTE_LIST_PAGE_META } from './blogListState'
import './BlogListPage.css'

const VISIBILITY_META = {
  PUBLIC: { label: '공개', cls: 'public', dot: true },
  PRIVATE: { label: '비공개', cls: 'private', dot: true },
  AI_COLLECTABLE: { label: 'AI 수집', cls: 'ai', dot: true },
}

const getVisMeta = (visibility) => VISIBILITY_META[visibility] ?? { label: visibility, cls: 'public', dot: false }

const formatDate = (iso) => {
  if (!iso) return '—'
  const date = new Date(iso)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

const BlogListPage = () => {
  const {
    tags,
    categoryId,
    setCategoryId,
    selectedTagIds,
    setSelectedTagIds,
    toggleTag,
    removeTag,
    addRecentNote,
  } = useVault()

  const [posts, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [tagQuery, setTagQuery] = useState('')
  const [sort, setSort] = useState('createdAt')
  const [order, setOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [pageMeta, setPageMeta] = useState(DEFAULT_NOTE_LIST_PAGE_META)
  const [visibility, setVisibility] = useState('')
  const [aiOnly, setAiOnly] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)

  const tagInputRef = useRef(null)
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const params = buildNoteListParams({
          page,
          size,
          query: debouncedQuery,
          categoryId,
          selectedTagIds,
          sort,
          order,
          visibility,
          aiOnly,
          dateFrom,
          dateTo,
        })
        const response = await fetchNotes(params)
        setNotes(response.posts || [])
        setPageMeta({
          total: response.total ?? 0,
          totalPages: response.totalPages ?? 0,
          hasNext: Boolean(response.hasNext),
          hasPrev: Boolean(response.hasPrev),
        })
      } catch (fetchError) {
        setError(fetchError.message)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [aiOnly, categoryId, dateFrom, dateTo, debouncedQuery, order, page, selectedTagIds, size, sort, visibility])

  const handleReset = () => {
    setQuery('')
    setCategoryId('')
    setSelectedTagIds([])
    setTagQuery('')
    setVisibility('')
    setAiOnly('')
    setDateFrom('')
    setDateTo('')
    setSort('createdAt')
    setOrder('desc')
    setSize(10)
    setPage(1)
  }

  const addTag = (tag) => {
    if (!selectedTagIds.includes(tag.id)) {
      setSelectedTagIds((prev) => [...prev, tag.id])
      setPage(1)
    }
    setTagQuery('')
  }

  const handleTagKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      const candidate = tags.find((tag) => tag.name.toLowerCase() === tagQuery.trim().toLowerCase())
      if (candidate) addTag(candidate)
    }

    if (event.key === 'Escape') {
      setTagQuery('')
    }
  }

  const tagSuggestions = tagQuery.trim()
    ? tags
        .filter(
          (tag) =>
            tag.name.toLowerCase().includes(tagQuery.trim().toLowerCase()) &&
            !selectedTagIds.includes(tag.id),
        )
        .slice(0, 6)
    : []

  return (
    <div className="blog-main">
      <div className="search-bar-wrap">
        <div className="search-bar">
          <i className="search-icon">⌕</i>
          <input
            className="search-input"
            value={query}
            onChange={(event) => {
              setPage(1)
              setQuery(event.target.value)
            }}
            placeholder="노트 검색 (제목 / 내용)..."
            aria-label="노트 검색"
          />
          {query && (
            <button className="search-clear-btn" onClick={() => setQuery('')} aria-label="검색어 지우기">
              ×
            </button>
          )}
          <span className="search-kbd">Ctrl K</span>
        </div>
      </div>

      <button className="filter-toggle-btn" onClick={() => setFilterOpen((open) => !open)} aria-expanded={filterOpen}>
        <span className="filter-toggle-icon">{filterOpen ? '▾' : '▸'}</span>
        필터
        {(selectedTagIds.length > 0 || visibility || aiOnly || dateFrom || dateTo) && (
          <span className="filter-toggle-badge">ON</span>
        )}
      </button>

      <div className={`filter-toolbar${filterOpen ? ' filter-toolbar--open' : ''}`} role="toolbar" aria-label="필터">
        {selectedTagIds.length > 0 && (
          <div className="filter-chips">
            {selectedTagIds.map((tagId) => {
              const tag = tags.find((item) => item.id === tagId)
              if (!tag) return null

              return (
                <span key={tagId} className="filter-chip">
                  #{tag.name}
                  <button className="filter-chip-remove" onClick={() => removeTag(tagId)} aria-label={`태그 ${tag.name} 제거`}>
                    ×
                  </button>
                </span>
              )
            })}
            <div className="toolbar-vdivider" />
          </div>
        )}

        <div className="toolbar-tag-input-wrap">
          <input
            ref={tagInputRef}
            className="toolbar-tag-input"
            value={tagQuery}
            onChange={(event) => setTagQuery(event.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="#태그 검색"
            aria-label="태그 입력"
          />
          {tagSuggestions.length > 0 && (
            <div className="tag-suggestions" role="listbox">
              {tagSuggestions.map((tag) => (
                <button
                  key={tag.id}
                  className="tag-suggestion-item"
                  role="option"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    addTag(tag)
                  }}
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="toolbar-vdivider" />

        <select
          className="toolbar-select"
          value={visibility}
          onChange={(event) => {
            setPage(1)
            setVisibility(event.target.value)
          }}
          aria-label="공개 설정"
        >
          <option value="">공개 설정</option>
          <option value="PUBLIC">공개</option>
          <option value="PRIVATE">비공개</option>
          <option value="AI_COLLECTABLE">AI 수집</option>
        </select>

        <div className="toolbar-vdivider" />

        <select
          className="toolbar-select"
          value={aiOnly}
          onChange={(event) => {
            setPage(1)
            setAiOnly(event.target.value)
          }}
          aria-label="AI 수집 여부"
        >
          <option value="">AI 수집 여부</option>
          <option value="true">허용</option>
          <option value="false">미허용</option>
        </select>

        <div className="toolbar-vdivider" />

        <input
          type="date"
          className="toolbar-date"
          value={dateFrom}
          onChange={(event) => {
            setDateFrom(event.target.value)
            setPage(1)
          }}
          aria-label="시작일"
        />
        <span className="toolbar-sep">–</span>
        <input
          type="date"
          className="toolbar-date"
          value={dateTo}
          onChange={(event) => {
            setDateTo(event.target.value)
            setPage(1)
          }}
          aria-label="종료일"
        />

        <div className="toolbar-vdivider" />

        <select
          className="toolbar-select"
          value={`${sort}:${order}`}
          onChange={(event) => {
            const [nextSort, nextOrder] = event.target.value.split(':')
            setSort(nextSort)
            setOrder(nextOrder)
            setPage(1)
          }}
          aria-label="정렬"
        >
          <option value="createdAt:desc">최신순</option>
          <option value="createdAt:asc">오래된순</option>
          <option value="title:asc">제목 오름차순</option>
          <option value="title:desc">제목 내림차순</option>
          <option value="updatedAt:desc">최근 수정순</option>
        </select>

        <div className="toolbar-vdivider" />

        <button className="toolbar-reset-btn" onClick={handleReset}>
          초기화
        </button>
      </div>

      <div className="blog-list-toolbar">
        <div className="blog-list-count">총 {pageMeta.total}개 노트</div>
        <select
          className="toolbar-select toolbar-select--compact"
          value={size}
          onChange={(event) => {
            setSize(Number(event.target.value))
            setPage(1)
          }}
          aria-label="페이지 크기"
        >
          {[10, 20, 50].map((option) => (
            <option key={option} value={option}>
              {option}개씩 보기
            </option>
          ))}
        </select>
      </div>

      {error && <div className="blog-error">{error}</div>}

      {loading ? (
        <div className="blog-empty">불러오는 중...</div>
      ) : posts.length === 0 ? (
        <div className="blog-empty">조건에 맞는 노트가 없습니다.</div>
      ) : (
        <div className="blog-list">
          {posts.map((post) => {
            const visibilityMeta = getVisMeta(post.visibility)
            return (
              <Link
                key={post.id}
                to={`/notes/${post.id}`}
                className="blog-card"
                onClick={() => addRecentNote(post)}
              >
                <div className="blog-card-head">
                  <div className="blog-card-title-wrap">
                    <h2 className="blog-card-title">{post.title}</h2>
                    <span className={`blog-vis-badge blog-vis-badge--${visibilityMeta.cls}`}>
                      {visibilityMeta.dot && <span className="blog-vis-dot" />}
                      {visibilityMeta.label}
                    </span>
                  </div>
                  <span className="blog-card-date">{formatDate(post.updatedAt || post.createdAt)}</span>
                </div>

                <div className="blog-card-meta">
                  {post.category && <span className="blog-card-category">📂 {post.category.name}</span>}
                  {post.aiCollectable && <span className="blog-card-ai">🤖 AI 수집 허용</span>}
                </div>

                {Array.isArray(post.tags) && post.tags.length > 0 && (
                  <div className="blog-card-tags">
                    {post.tags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        className="blog-card-tag"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          toggleTag(tag.id)
                          setPage(1)
                        }}
                      >
                        #{tag.name}
                      </button>
                    ))}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}

      {pageMeta.totalPages > 1 && (
        <div className="blog-pagination">
          <button disabled={!pageMeta.hasPrev} onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}>
            ← 이전
          </button>
          <span>
            {page} / {pageMeta.totalPages}
          </span>
          <button disabled={!pageMeta.hasNext} onClick={() => setPage((currentPage) => currentPage + 1)}>
            다음 →
          </button>
        </div>
      )}
    </div>
  )
}

export default BlogListPage
