import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchNotes } from '../api/client'
import { useVault } from '../contexts/VaultContext'
import { useDebounce } from '../hooks/useDebounce'
import { setDraggedNote } from '../utils/noteDrag'
import { estimateReadTime } from '../utils/format'
import { buildNoteListParams, DEFAULT_NOTE_LIST_PAGE_META } from './blogListState'
import './BlogListPage.css'

const VISIBILITY_META = {
  PUBLIC: { label: '공개', cls: 'public', dot: true },
  PRIVATE: { label: '비공개', cls: 'private', dot: true },
  AI_COLLECTABLE: { label: 'AI 수집', cls: 'ai', dot: true },
}

const QUICK_FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'public', label: '공개' },
  { key: 'ai', label: 'AI 활용 가능' },
  { key: 'private', label: '비공개' },
]

const getVisMeta = (visibility) => VISIBILITY_META[visibility] ?? { label: visibility, cls: 'public', dot: false }

function attachCategoryMeta(posts, categories) {
  return posts.map((post) => {
    const folderId = post.folderId ?? post.categoryId ?? post.category?.id ?? null

    return {
      ...post,
      folderId,
      categoryId: folderId,
      category: categories.find((category) => String(category.id) === String(folderId)) || post.category || null,
    }
  })
}

const formatDate = (iso) => {
  if (!iso) return '—'
  const date = new Date(iso)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

const BlogListPage = () => {
  const {
    categories,
    categoryId,
    setCategoryId,
    setSelectedTagIds,
    addRecentNote,
    notesRevision,
  } = useVault()

  const [posts, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
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

  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    setSelectedTagIds([])
  }, [setSelectedTagIds])

  useEffect(() => {
    setPage(1)
  }, [categoryId])

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
          sort,
          order,
          visibility,
          aiOnly,
          dateFrom,
          dateTo,
        })
        const response = await fetchNotes(params)
        setNotes(attachCategoryMeta(response.posts || [], categories))
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
  }, [aiOnly, categories, categoryId, dateFrom, dateTo, debouncedQuery, notesRevision, order, page, size, sort, visibility])

  const handleResetFilters = () => {
    setVisibility('')
    setAiOnly('')
    setDateFrom('')
    setDateTo('')
    setSort('createdAt')
    setOrder('desc')
    setSize(10)
    setPage(1)
  }

  const handleResetAll = () => {
    setQuery('')
    setCategoryId('')
    handleResetFilters()
  }

  const applyQuickFilter = (filterKey) => {
    setPage(1)

    if (filterKey === 'all') {
      setVisibility('')
      setAiOnly('')
      return
    }

    if (filterKey === 'public') {
      setVisibility('PUBLIC')
      setAiOnly('')
      return
    }

    if (filterKey === 'private') {
      setVisibility('PRIVATE')
      setAiOnly('')
      return
    }

    setVisibility('')
    setAiOnly('true')
  }

  const activeFolder = categories.find((category) => String(category.id) === String(categoryId))
  const activeFilterChips = [
    debouncedQuery ? `검색: ${debouncedQuery}` : null,
    activeFolder ? `폴더: ${activeFolder.name}` : null,
    visibility ? `공개 범위: ${getVisMeta(visibility).label}` : null,
    aiOnly === 'true' ? 'AI 수집 허용' : null,
    aiOnly === 'false' ? 'AI 수집 미허용' : null,
    dateFrom ? `${dateFrom}부터` : null,
    dateTo ? `${dateTo}까지` : null,
  ].filter(Boolean)

  const advancedFilterCount = [
    dateFrom,
    dateTo,
    sort !== 'createdAt' || order !== 'desc' ? 'sort' : '',
    size !== 10 ? 'size' : '',
  ].filter(Boolean).length
  const activeQuickFilter = aiOnly === 'true'
    ? 'ai'
    : visibility === 'PUBLIC'
      ? 'public'
      : visibility === 'PRIVATE'
        ? 'private'
        : 'all'
  const scopeTitle = activeFolder ? `${activeFolder.name} 폴더 문서` : (activeFilterChips.length > 0 ? `${activeFilterChips.length}개 조건 적용 중` : '전체 문서를 보는 중')
  const scopeHint = activeFolder
    ? `${activeFolder.name} 폴더 안의 문서를 중심으로 보고 있습니다.`
    : '검색을 먼저 쓰고, 날짜나 정렬이 필요할 때만 고급 필터를 열어보세요.'

  return (
    <div className="blog-main">
      <div className="note-shell-header">
        <div className="note-shell-header-copy">
          <p className="note-shell-kicker">문서 라이브러리</p>
          <h1 className="note-shell-title">노트 보관함</h1>
          <p className="note-shell-subtitle">
            제목과 본문을 먼저 검색하고, 필요할 때만 고급 필터를 열어 문서를 좁혀보세요.
          </p>
        </div>
        <div className="note-shell-header-actions">
          <Link to="/notes/write" className="note-shell-create-btn">새 노트 작성</Link>
        </div>
      </div>

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
            placeholder="제목이나 본문으로 문서를 검색하세요"
            aria-label="노트 검색"
          />
          {query && (
            <button className="search-clear-btn" onClick={() => setQuery('')} aria-label="검색어 지우기">
              ×
            </button>
          )}
        </div>
      </div>

      <div className="note-list-quick-actions" aria-label="빠른 필터">
        {QUICK_FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            className={`quick-filter-btn${activeQuickFilter === filter.key ? ' active' : ''}`}
            onClick={() => applyQuickFilter(filter.key)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="note-list-summary">
        <div className="note-list-summary-main">
          <div>
            <span className="note-list-summary-label">현재 보기</span>
            <strong className="note-list-summary-count">{scopeTitle}</strong>
            <span className="note-list-summary-hint">{scopeHint}</span>
          </div>
          <div className="note-list-summary-meta">
            <span>총 {pageMeta.total}개 문서</span>
            <span>{sort === 'updatedAt' ? '최근 수정 순' : order === 'desc' ? '최신 생성 순' : '오래된 생성 순'}</span>
            <span>{size}개씩 보기</span>
          </div>
        </div>
        {activeFilterChips.length > 0 && (
          <div className="note-list-active-filters">
            {activeFilterChips.map((chip) => (
              <span key={chip} className="note-list-filter-chip">{chip}</span>
            ))}
            <button type="button" className="note-list-reset-inline" onClick={handleResetAll}>
              전체 초기화
            </button>
          </div>
        )}
      </div>

      <button className="filter-toggle-btn" onClick={() => setFilterOpen((open) => !open)} aria-expanded={filterOpen}>
        <span className="filter-toggle-icon">{filterOpen ? '▾' : '▸'}</span>
        고급 필터
        {advancedFilterCount > 0 && <span className="filter-toggle-badge">{advancedFilterCount}</span>}
      </button>

      <div className={`filter-toolbar${filterOpen ? ' filter-toolbar--open' : ''}`} role="toolbar" aria-label="필터">
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

        <button className="toolbar-reset-btn" onClick={handleResetAll}>전체 초기화</button>
      </div>

      {error && <div className="blog-error">{error}</div>}

      {loading ? (
        <div className="blog-empty">문서를 불러오는 중입니다...</div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <h2 className="empty-state-title">
            {activeFilterChips.length > 0 ? '조건에 맞는 문서가 없습니다.' : '아직 작성된 문서가 없습니다.'}
          </h2>
          <p className="empty-state-sub">
            {activeFilterChips.length > 0
              ? '검색어나 날짜 조건을 조금 완화하면 더 많은 문서를 볼 수 있습니다.'
              : '첫 문서를 작성하면 이곳에서 최근 작업과 함께 빠르게 다시 찾을 수 있습니다.'}
          </p>
          <div className="empty-state-actions">
            <button type="button" className="empty-state-btn empty-state-btn--ghost" onClick={handleResetAll}>
              전체 초기화
            </button>
            <Link to="/notes/write" className="empty-state-btn">새 노트 작성</Link>
          </div>
        </div>
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
                draggable
                onDragStart={(event) => setDraggedNote(event, post)}
              >
                <div className="blog-card-main">
                  <div className="blog-card-head">
                    <div className="blog-card-title-wrap">
                      <h2 className="blog-card-title">{post.title}</h2>
                    </div>
                    <span className="blog-card-date">{formatDate(post.updatedAt || post.createdAt)}</span>
                  </div>

                  <p className="blog-card-preview">
                    {(post.content || '').replace(/\s+/g, ' ').slice(0, 140) || '본문이 아직 없습니다.'}
                  </p>

                  <div className="blog-card-meta">
                    <span>{post.category?.name || '미분류'}</span>
                    <span>{estimateReadTime(post.content)}분 읽기</span>
                    <span className={`blog-vis-badge blog-vis-badge--${visibilityMeta.cls}`}>
                      {visibilityMeta.dot && <span className="blog-vis-dot" />}
                      {visibilityMeta.label}
                    </span>
                    {post.aiCollectable && <span className="blog-card-ai">AI 수집 허용</span>}
                  </div>
                </div>
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
          <span>{page} / {pageMeta.totalPages}</span>
          <button disabled={!pageMeta.hasNext} onClick={() => setPage((currentPage) => currentPage + 1)}>
            다음 →
          </button>
        </div>
      )}
    </div>
  )
}

export default BlogListPage
