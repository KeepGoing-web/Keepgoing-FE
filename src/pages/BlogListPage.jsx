import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './BlogListPage.css'
import { fetchBlogs } from '../api/client'
import { useVault } from '../contexts/VaultContext'

/* ── Helpers ──────────────────────────────────────────── */

const VISIBILITY_META = {
  PUBLIC:        { label: '공개',    cls: 'public',  dot: true },
  PRIVATE:       { label: '비공개', cls: 'private', dot: true },
  AI_COLLECTABLE:{ label: 'AI 수집', cls: 'ai',      dot: true },
}

const getVisMeta = (v) => VISIBILITY_META[v] ?? { label: v, cls: 'public', dot: false }

const formatDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/* ── Main component ───────────────────────────────────── */

const BlogListPage = () => {
  const {
    categories, tags,
    categoryId, setCategoryId,
    selectedTagIds, setSelectedTagIds,
    toggleTag, removeTag, addRecentPost,
  } = useVault()

  /* ── Local state (page-specific) ── */
  const [posts, setPosts]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [query, setQuery]               = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [tagQuery, setTagQuery]         = useState('')
  const [sort, setSort]                 = useState('createdAt')
  const [order, setOrder]               = useState('desc')
  const [page, setPage]                 = useState(1)
  const [size, setSize]                 = useState(10)
  const [pageMeta, setPageMeta]         = useState({
    total: 0, totalPages: 0, hasNext: false, hasPrev: false,
  })
  const [visibility, setVisibility]     = useState('')
  const [aiOnly, setAiOnly]             = useState('')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [filterOpen, setFilterOpen]     = useState(false)

  const tagInputRef = useRef(null)

  /* Debounce search */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  /* Fetch paginated posts for main list */
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = {
          page, size,
          q: debouncedQuery,
          categoryId: (categoryId && categoryId !== '__uncategorized__') ? categoryId : undefined,
          tagId: selectedTagIds.length > 0 ? selectedTagIds.join(',') : undefined,
          sort, order,
          visibility: visibility || undefined,
          aiCollectable: aiOnly || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }
        const res = await fetchBlogs(params)
        setPosts(res.posts || [])
        setPageMeta({
          total: res.total ?? 0,
          totalPages: res.totalPages ?? 0,
          hasNext: !!res.hasNext,
          hasPrev: !!res.hasPrev,
        })
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [page, size, debouncedQuery, categoryId, selectedTagIds, sort, order, visibility, aiOnly, dateFrom, dateTo])

  /* ── Handlers ── */

  const handleReset = () => {
    setQuery('')
    setDebouncedQuery('')
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

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const candidate = tags.find(
        (t) => t.name.toLowerCase() === tagQuery.trim().toLowerCase()
      )
      if (candidate) addTag(candidate)
    }
    if (e.key === 'Escape') setTagQuery('')
  }

  /* Filtered tag suggestions */
  const tagSuggestions = tagQuery.trim()
    ? tags
        .filter(
          (t) =>
            t.name.toLowerCase().includes(tagQuery.trim().toLowerCase()) &&
            !selectedTagIds.includes(t.id)
        )
        .slice(0, 6)
    : []

  /* ── Render ── */

  return (
    <div className="blog-main">

      {/* Search bar */}
      <div className="search-bar-wrap">
        <div className="search-bar">
          <i className="search-icon">⌕</i>
          <input
            className="search-input"
            value={query}
            onChange={(e) => { setPage(1); setQuery(e.target.value) }}
            placeholder="포스트 검색 (제목 / 내용)..."
            aria-label="포스트 검색"
          />
          {query && (
            <button
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0 2px' }}
              onClick={() => { setQuery(''); setDebouncedQuery('') }}
              aria-label="검색어 지우기"
            >
              ×
            </button>
          )}
          <span className="search-kbd">Ctrl K</span>
        </div>
      </div>

      {/* Filter toggle (mobile) */}
      <button
        className="filter-toggle-btn"
        onClick={() => setFilterOpen((v) => !v)}
        aria-expanded={filterOpen}
      >
        <span className="filter-toggle-icon">{filterOpen ? '▾' : '▸'}</span>
        필터
        {(selectedTagIds.length > 0 || visibility || aiOnly || dateFrom || dateTo) && (
          <span className="filter-toggle-badge">ON</span>
        )}
      </button>

      {/* Filter toolbar */}
      <div className={`filter-toolbar${filterOpen ? ' filter-toolbar--open' : ''}`} role="toolbar" aria-label="필터">

        {/* Active tag chips */}
        {selectedTagIds.length > 0 && (
          <div className="filter-chips">
            {selectedTagIds.map((tid) => {
              const t = tags.find((x) => x.id === tid)
              if (!t) return null
              return (
                <span key={tid} className="filter-chip">
                  #{t.name}
                  <button
                    className="filter-chip-remove"
                    onClick={() => removeTag(tid)}
                    aria-label={`태그 ${t.name} 제거`}
                  >×</button>
                </span>
              )
            })}
            <div className="toolbar-vdivider" />
          </div>
        )}

        {/* Tag search */}
        <div className="toolbar-tag-input-wrap">
          <input
            ref={tagInputRef}
            className="toolbar-tag-input"
            value={tagQuery}
            onChange={(e) => setTagQuery(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="#태그 검색"
            aria-label="태그 입력"
          />
          {tagSuggestions.length > 0 && (
            <div className="tag-suggestions" role="listbox">
              {tagSuggestions.map((t) => (
                <button
                  key={t.id}
                  className="tag-suggestion-item"
                  role="option"
                  onMouseDown={(e) => { e.preventDefault(); addTag(t) }}
                >
                  #{t.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="toolbar-vdivider" />

        {/* Visibility */}
        <select
          className="toolbar-select"
          value={visibility}
          onChange={(e) => { setPage(1); setVisibility(e.target.value) }}
          aria-label="공개 설정"
        >
          <option value="">공개 설정</option>
          <option value="PUBLIC">공개</option>
          <option value="PRIVATE">비공개</option>
          <option value="AI_COLLECTABLE">AI 수집</option>
        </select>

        <div className="toolbar-vdivider" />

        {/* AI collectable */}
        <select
          className="toolbar-select"
          value={aiOnly}
          onChange={(e) => { setPage(1); setAiOnly(e.target.value) }}
          aria-label="AI 수집 여부"
        >
          <option value="">AI 수집 여부</option>
          <option value="true">허용</option>
          <option value="false">미허용</option>
        </select>

        <div className="toolbar-vdivider" />

        {/* Date range */}
        <input
          type="date"
          className="toolbar-date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
          aria-label="시작일"
        />
        <span className="toolbar-sep">–</span>
        <input
          type="date"
          className="toolbar-date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
          aria-label="종료일"
        />

        <div className="toolbar-vdivider" />

        {/* Sort */}
        <select
          className="toolbar-select"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="정렬 기준"
        >
          <option value="createdAt">작성일</option>
          <option value="updatedAt">수정일</option>
          <option value="title">제목</option>
        </select>
        <select
          className="toolbar-select"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          aria-label="정렬 방향"
        >
          <option value="desc">↓</option>
          <option value="asc">↑</option>
        </select>

        {/* Reset */}
        <button className="toolbar-reset" onClick={handleReset} aria-label="필터 초기화">
          초기화
        </button>
      </div>

      {/* Error */}
      {error && <div className="vault-error" role="alert">{error}</div>}

      {/* Post list */}
      <div className="post-list-wrap" role="main">
        {loading ? (
          <div className="vault-loading" aria-live="polite" aria-busy="true">
            <span className="vault-loading-dot" />
            <span className="vault-loading-dot" />
            <span className="vault-loading-dot" />
            <span>로딩 중...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <p className="empty-state-title">포스트가 없습니다</p>
            <p className="empty-state-sub">조건에 맞는 포스트를 찾을 수 없습니다.</p>
            <Link to="/blogs/write" className="empty-state-btn">
              <span>✦</span> 첫 포스트 작성하기
            </Link>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="post-list-header" aria-hidden="true">
              <span>제목</span>
              <span className="col-category">카테고리</span>
              <span>공개</span>
              <span className="col-date">날짜</span>
            </div>

            {/* Entries */}
            {posts.map((post) => {
              const vis = getVisMeta(post.visibility)
              return (
                <Link
                  key={post.id}
                  to={`/blogs/${post.id}`}
                  className="post-entry"
                  aria-label={post.title}
                  onClick={() => addRecentPost(post)}
                >
                  {/* Main column */}
                  <div className="post-entry-main">
                    <div className="post-entry-title-row">
                      <i className="post-entry-icon">📄</i>
                      <span className="post-entry-title">{post.title}</span>
                      {post.aiCollectable && (
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.65rem',
                          color: 'var(--badge-ai-text)',
                          background: 'var(--badge-ai-bg)',
                          border: '1px solid rgba(137,220,235,0.2)',
                          borderRadius: '3px',
                          padding: '1px 4px',
                          flexShrink: 0,
                        }}>AI</span>
                      )}
                    </div>
                    {post.content && (
                      <p className="post-entry-preview">{post.content}</p>
                    )}
                    {Array.isArray(post.tags) && post.tags.length > 0 && (
                      <div className="post-entry-tags">
                        {post.tags.map((t) => (
                          <span key={t.id} className="post-tag">#{t.name}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Category */}
                  <div className="post-entry-col category col-category">
                    {post.category ? post.category.name : '—'}
                  </div>

                  {/* Visibility */}
                  <div className="post-entry-col">
                    <span className={`vis-badge ${vis.cls}`}>
                      {vis.dot && <span className="vis-badge-dot" />}
                      {vis.label}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="post-entry-col date col-date">
                    {formatDate(post.createdAt)}
                  </div>
                </Link>
              )
            })}
          </>
        )}
      </div>

      {/* Pagination */}
      <div className="pagination-bar" aria-label="페이지 네비게이션">
        <button
          className="pagination-btn"
          disabled={!pageMeta.hasPrev}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          aria-label="이전 페이지"
        >
          ← 이전
        </button>
        <span className="pagination-info">
          {page} / {Math.max(1, pageMeta.totalPages)}
        </span>
        <button
          className="pagination-btn"
          disabled={!pageMeta.hasNext}
          onClick={() => setPage((p) => p + 1)}
          aria-label="다음 페이지"
        >
          다음 →
        </button>
        <select
          className="pagination-size-select"
          value={size}
          onChange={(e) => { setPage(1); setSize(Number(e.target.value)) }}
          aria-label="페이지당 항목 수"
        >
          <option value={10}>10개</option>
          <option value={20}>20개</option>
          <option value={50}>50개</option>
        </select>
        <span className="pagination-total">총 {pageMeta.total}개</span>
      </div>

    </div>
  )
}

export default BlogListPage
