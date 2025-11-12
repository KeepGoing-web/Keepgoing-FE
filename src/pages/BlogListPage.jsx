import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './BlogListPage.css'
import { fetchBlogs, fetchCategories, fetchTags } from '../api/client'

const BlogListPage = () => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState([])
  const [tagQuery, setTagQuery] = useState('')
  const [sort, setSort] = useState('createdAt')
  const [order, setOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [pageMeta, setPageMeta] = useState({
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  })
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  const [visibility, setVisibility] = useState('')
  const [aiOnly, setAiOnly] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

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
        // 메타 실패는 목록 조회를 막지는 않음
      }
    }
    loadMeta()
  }, [])

  // 검색어 디바운스
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = {
          page,
          size,
          q: debouncedQuery,
          categoryId: categoryId || undefined,
          tagId:
            selectedTagIds.length > 0 ? selectedTagIds.join(',') : undefined,
          sort,
          order,
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

  const getVisibilityLabel = (visibility) => {
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
      <div className="filters" style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={query}
            onChange={(e) => {
              setPage(1)
              setQuery(e.target.value)
            }}
            placeholder="검색어(제목/내용)"
            style={{ flex: 1 }}
          />
          <select
            value={categoryId}
            onChange={(e) => {
              setPage(1)
              setCategoryId(e.target.value)
            }}
          >
            <option value="">전체 카테고리</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="tag-tokenizer">
            <input
              value={tagQuery}
              onChange={(e) => setTagQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const candidate = tags.find(
                    (t) =>
                      t.name.toLowerCase() === tagQuery.trim().toLowerCase()
                  )
                  if (candidate && !selectedTagIds.includes(candidate.id)) {
                    setSelectedTagIds((prev) => [...prev, candidate.id])
                    setPage(1)
                    setTagQuery('')
                  }
                }
              }}
              placeholder="태그 입력 후 Enter"
            />
            {tagQuery.trim() && (
              <div className="suggestion-list">
                {tags
                  .filter(
                    (t) =>
                      t.name
                        .toLowerCase()
                        .includes(tagQuery.trim().toLowerCase()) &&
                      !selectedTagIds.includes(t.id)
                  )
                  .slice(0, 6)
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="suggestion-item"
                      onClick={() => {
                        setSelectedTagIds((prev) => [...prev, t.id])
                        setPage(1)
                        setTagQuery('')
                      }}
                    >
                      #{t.name}
                    </button>
                  ))}
              </div>
            )}
          </div>
          <select
            value={visibility}
            onChange={(e) => {
              setPage(1)
              setVisibility(e.target.value)
            }}
          >
            <option value="">전체 공개 설정</option>
            <option value="PUBLIC">공개</option>
            <option value="PRIVATE">비공개</option>
            <option value="AI_COLLECTABLE">AI 수집 가능</option>
          </select>
          <select
            value={aiOnly}
            onChange={(e) => {
              setPage(1)
              setAiOnly(e.target.value)
            }}
          >
            <option value="">AI 수집 여부</option>
            <option value="true">허용</option>
            <option value="false">미허용</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="tag-chips">
            {selectedTagIds.map((tid) => {
              const t = tags.find((x) => x.id === tid)
              if (!t) return null
              return (
                <span key={tid} className="chip">
                  #{t.name}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => {
                      setSelectedTagIds((prev) => prev.filter((id) => id !== tid))
                      setPage(1)
                    }}
                    aria-label={`태그 ${t.name} 제거`}
                  >
                    ×
                  </button>
                </span>
              )
            })}
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value)
              setPage(1)
            }}
            aria-label="시작일"
          />
          <span style={{ color: '#777' }}>~</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value)
              setPage(1)
            }}
            aria-label="종료일"
          />
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="createdAt">작성일</option>
            <option value="updatedAt">수정일</option>
            <option value="title">제목</option>
          </select>
          <select value={order} onChange={(e) => setOrder(e.target.value)}>
            <option value="desc">내림차순</option>
            <option value="asc">오름차순</option>
          </select>
          <select
            value={size}
            onChange={(e) => {
              setPage(1)
              setSize(Number(e.target.value))
            }}
          >
            <option value={10}>10개</option>
            <option value={20}>20개</option>
            <option value={50}>50개</option>
          </select>
          <button
            type="button"
            className="reset-button"
            onClick={() => {
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
            }}
          >
            초기화
          </button>
        </div>
      </div>
      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}
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
                  {post.category && (
                    <span className="category-badge" style={{ marginLeft: 8 }}>
                      #{post.category.name}
                    </span>
                  )}
                </div>
              </div>
              <p className="blog-preview">{post.content}</p>
              {Array.isArray(post.tags) && post.tags.length > 0 && (
                <div className="tag-list" style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {post.tags.map((t) => (
                    <span key={t.id} className="tag-badge">#{t.name}</span>
                  ))}
                </div>
              )}
              <div className="blog-date">
                {new Date(post.createdAt).toLocaleDateString('ko-KR')}
              </div>
            </Link>
          ))
        )}
      </div>
      <div className="pagination" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
        <button disabled={!pageMeta.hasPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          이전
        </button>
        <span>
          {page} / {Math.max(1, pageMeta.totalPages)}
        </span>
        <button disabled={!pageMeta.hasNext} onClick={() => setPage((p) => p + 1)}>
          다음
        </button>
        <span style={{ marginLeft: 'auto' }}>
          총 {pageMeta.total}개
        </span>
      </div>
    </div>
  )
}

export default BlogListPage

