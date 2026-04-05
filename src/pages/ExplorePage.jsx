import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { fetchUsers } from '../api/client'
import './ExplorePage.css'

const ExplorePage = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageMeta, setPageMeta] = useState({ total: 0, totalPages: 1, hasNext: false, hasPrev: false })

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchUsers({ q: debouncedSearch, page, size: 12 })
      setUsers(data.users || [])
      setPageMeta({
        total: data.total ?? 0,
        totalPages: data.totalPages ?? 1,
        hasNext: !!data.hasNext,
        hasPrev: !!data.hasPrev,
      })
    } catch {
      /* non-fatal */
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, page])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  return (
    <div className="explore-page">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="explore-header">
        <h1 className="explore-title">탐색</h1>
        <p className="explore-subtitle">다른 사용자의 노트를 둘러보세요</p>
      </div>

      {/* ── Search ──────────────────────────────────────── */}
      <div className="explore-search-wrap">
        <span className="explore-search-icon">⌕</span>
        <input
          className="explore-search"
          type="text"
          placeholder="이름 또는 @username으로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="사용자 검색"
        />
      </div>

      {/* ── User grid ───────────────────────────────────── */}
      {loading ? (
        <div className="explore-loading" aria-live="polite">
          <span className="explore-loading-dot" />
          <span className="explore-loading-dot" />
          <span className="explore-loading-dot" />
        </div>
      ) : users.length === 0 ? (
        <div className="explore-empty">
          <div className="explore-empty-icon">👤</div>
          <p>{debouncedSearch ? `"${debouncedSearch}"에 대한 결과가 없습니다` : '등록된 사용자가 없습니다'}</p>
        </div>
      ) : (
        <div className="explore-grid">
          {users.map((u) => (
            <Link
              key={u.id}
              to={`/users/${u.username}`}
              className="explore-card"
              aria-label={`${u.name}의 노트`}
            >
              <div className="explore-card-top">
                <div className="explore-avatar">
                  {u.name ? u.name.charAt(0) : u.username.charAt(0).toUpperCase()}
                </div>
                <div className="explore-card-info">
                  <p className="explore-card-name">{u.name}</p>
                  <p className="explore-card-handle">@{u.username}</p>
                </div>
              </div>

              {u.bio && <p className="explore-card-bio">{u.bio}</p>}

              <div className="explore-card-footer">
                {Array.isArray(u.techStack) && u.techStack.length > 0 && (
                  <div className="explore-card-techs">
                    {u.techStack.slice(0, 3).map((t) => (
                      <span key={t} className="explore-tech-tag">#{t}</span>
                    ))}
                    {u.techStack.length > 3 && (
                      <span className="explore-tech-tag">+{u.techStack.length - 3}</span>
                    )}
                  </div>
                )}
                <span className="explore-card-posts">{u.noteCount}개 노트</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────── */}
      {pageMeta.totalPages > 1 && (
        <div className="explore-pagination">
          <button
            className="explore-page-btn"
            disabled={!pageMeta.hasPrev}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← 이전
          </button>
          <span className="explore-page-info">{page} / {pageMeta.totalPages}</span>
          <button
            className="explore-page-btn"
            disabled={!pageMeta.hasNext}
            onClick={() => setPage((p) => p + 1)}
          >
            다음 →
          </button>
        </div>
      )}
    </div>
  )
}

export default ExplorePage
