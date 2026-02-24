import { useState, useEffect } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { fetchPublicProfile, fetchPublicPosts } from '../api/client'
import './PublicProfilePage.css'

const formatDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

const estimateReadTime = (content = '') => {
  const mins = Math.max(1, Math.round(content.length / 500))
  return `읽기 ${mins}분`
}

const PublicProfilePage = () => {
  const { username } = useParams()
  const location = useLocation()
  const basePath = location.pathname.startsWith('/users/') ? `/users/${username}` : `/@${username}`

  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [pageMeta, setPageMeta] = useState({ total: 0, totalPages: 1, hasNext: false, hasPrev: false })
  const [page, setPage] = useState(1)
  const [order, setOrder] = useState('desc')
  const [profileLoading, setProfileLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(true)
  const [error, setError] = useState(null)

  /* Load profile once */
  useEffect(() => {
    const load = async () => {
      setProfileLoading(true)
      try {
        const data = await fetchPublicProfile(username)
        setProfile(data)
      } catch {
        setError('프로필을 불러올 수 없습니다.')
      } finally {
        setProfileLoading(false)
      }
    }
    load()
  }, [username])

  /* Load posts on page / order change */
  useEffect(() => {
    const load = async () => {
      setPostsLoading(true)
      try {
        const data = await fetchPublicPosts(username, { page, size: 10, sort: 'createdAt', order })
        setPosts(data.posts || [])
        setPageMeta({
          total: data.total ?? 0,
          totalPages: data.totalPages ?? 1,
          hasNext: !!data.hasNext,
          hasPrev: !!data.hasPrev,
        })
      } catch {
        /* non-fatal */
      } finally {
        setPostsLoading(false)
      }
    }
    load()
  }, [username, page, order])

  const handleOrderToggle = () => {
    setOrder((o) => (o === 'desc' ? 'asc' : 'desc'))
    setPage(1)
  }

  if (profileLoading) {
    return (
      <div className="pub-profile-page">
        <div className="pub-loading" aria-live="polite">
          <span className="pub-loading-dot" />
          <span className="pub-loading-dot" />
          <span className="pub-loading-dot" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pub-profile-page">
        <div className="pub-error">{error}</div>
      </div>
    )
  }

  return (
    <div className="pub-profile-page">
      <div className="pub-container">

        {/* ── Profile card ──────────────────────────────── */}
        <section className="pub-profile-card" aria-label="프로필">
          <div className="pub-avatar" aria-hidden="true">
            {profile?.name ? profile.name.charAt(0) : username.charAt(0).toUpperCase()}
          </div>

          <div className="pub-profile-info">
            <h1 className="pub-profile-name">{profile?.name ?? username}</h1>
            <p className="pub-profile-handle">
              @{username}
              {profile?.bio && (
                <>
                  <span className="pub-profile-sep">·</span>
                  <span className="pub-profile-bio">{profile.bio}</span>
                </>
              )}
            </p>
          </div>

          {Array.isArray(profile?.techStack) && profile.techStack.length > 0 && (
            <div className="pub-tech-stack" aria-label="기술 스택">
              {profile.techStack.map((tech) => (
                <span key={tech} className="pub-tech-tag">#{tech}</span>
              ))}
            </div>
          )}
        </section>

        <div className="pub-divider" role="separator" />

        {/* ── Posts section ─────────────────────────────── */}
        <section className="pub-posts-section" aria-label="포스트 목록">
          <div className="pub-posts-header">
            <h2 className="pub-posts-title">
              <span className="pub-posts-icon">📝</span>
              Posts
              {pageMeta.total > 0 && (
                <span className="pub-posts-count">({pageMeta.total})</span>
              )}
            </h2>
            <button
              className="pub-sort-btn"
              onClick={handleOrderToggle}
              aria-label={order === 'desc' ? '오래된 순으로 정렬' : '최신 순으로 정렬'}
            >
              {order === 'desc' ? '최신순 ▾' : '오래된순 ▴'}
            </button>
          </div>

          {postsLoading ? (
            <div className="pub-loading" aria-live="polite" aria-busy="true">
              <span className="pub-loading-dot" />
              <span className="pub-loading-dot" />
              <span className="pub-loading-dot" />
            </div>
          ) : posts.length === 0 ? (
            <div className="pub-empty">
              <p>아직 공개된 포스트가 없습니다.</p>
            </div>
          ) : (
            <ul className="pub-post-list" role="list">
              {posts.map((post) => (
                <li key={post.id} className="pub-post-item" role="listitem">
                  <Link
                    to={`${basePath}/${post.id}`}
                    className="pub-post-link"
                    aria-label={post.title}
                  >
                    <h3 className="pub-post-title">{post.title}</h3>
                    {post.content && (
                      <p className="pub-post-preview">
                        {post.content.length > 120
                          ? post.content.slice(0, 120) + '…'
                          : post.content}
                      </p>
                    )}
                    <div className="pub-post-meta">
                      {Array.isArray(post.tags) && post.tags.length > 0 && (
                        <span className="pub-post-tags">
                          {post.tags.map((t) => (
                            <span key={t.id} className="pub-post-tag">#{t.name}</span>
                          ))}
                        </span>
                      )}
                      <span className="pub-post-meta-sep">·</span>
                      <time className="pub-post-date" dateTime={post.createdAt}>
                        {formatDate(post.createdAt)}
                      </time>
                      <span className="pub-post-meta-sep">·</span>
                      <span className="pub-post-readtime">{estimateReadTime(post.content)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* ── Pagination ──────────────────────────────── */}
          {pageMeta.totalPages > 1 && (
            <div className="pub-pagination" aria-label="페이지 네비게이션">
              <button
                className="pub-page-btn"
                disabled={!pageMeta.hasPrev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="이전 페이지"
              >
                ← 이전
              </button>
              <span className="pub-page-info">
                {page} / {pageMeta.totalPages}
              </span>
              <button
                className="pub-page-btn"
                disabled={!pageMeta.hasNext}
                onClick={() => setPage((p) => p + 1)}
                aria-label="다음 페이지"
              >
                다음 →
              </button>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

export default PublicProfilePage
