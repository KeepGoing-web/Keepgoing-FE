import { Link } from 'react-router-dom'
import { useVault } from '../contexts/VaultContext'
import { formatDate, estimateReadTime } from '../utils/format'
import ActivityHeatmap from '../components/ActivityHeatmap'
import LoadingDots from '../components/LoadingDots'
import './DashboardPage.css'

const DashboardPage = () => {
  const {
    allNotes,
    categories,
    categoryStats,
    tags,
    recentNotes,
    tagCounts,
    loading,
    navigateToNote,
    setCategoryId,
    toggleTag,
  } = useVault()

  const uncategorizedCount = allNotes.filter((post) => !post.category).length
  const latestNotes = [...allNotes]
    .sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt))
    .slice(0, 5)

  if (loading) {
    return (
      <div className="dash-page">
        <LoadingDots />
      </div>
    )
  }

  return (
    <div className="dash-page">
      <div className="dash-scroll">
        {allNotes.length === 0 ? (
          <div className="dash-welcome">
            <h1 className="dash-welcome-title">Keepgoing에 오신 걸 환영합니다</h1>
            <p className="dash-welcome-sub">노트를 작성하고, AI로 분석하고, 커리어를 관리하세요.</p>
            <div className="dash-welcome-cards">
              <Link to="/notes/write" className="dash-welcome-card">
                <span className="dash-welcome-card-icon">✦</span>
                <h3>첫 노트 작성</h3>
                <p>마크다운 에디터로 기술 노트를 작성해보세요.</p>
              </Link>
              <Link to="/query" className="dash-welcome-card">
                <span className="dash-welcome-card-icon">⬡</span>
                <h3>AI 질의</h3>
                <p>작성한 노트를 기반으로 AI가 질문에 답변합니다.</p>
              </Link>
              <Link to="/resume" className="dash-welcome-card">
                <span className="dash-welcome-card-icon">◈</span>
                <h3>이력서 생성</h3>
                <p>노트를 분석하여 이력서와 자기소개서를 생성합니다.</p>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="dash-header">
              <h1 className="dash-title">Dashboard</h1>
              <Link to="/notes/write" className="dash-write-btn">
                <span>✦</span> 새 노트 작성
              </Link>
            </div>

            <div className="dash-stats">
              <div className="dash-stat-card">
                <span className="dash-stat-value">{allNotes.length}</span>
                <span className="dash-stat-label">노트</span>
              </div>
              <div className="dash-stat-card">
                <span className="dash-stat-value">{categories.length}</span>
                <span className="dash-stat-label">카테고리</span>
              </div>
              <div className="dash-stat-card">
                <span className="dash-stat-value">{tags.length}</span>
                <span className="dash-stat-label">태그</span>
              </div>
              <div className="dash-stat-card">
                <span className="dash-stat-value">
                  {allNotes.filter((post) => post.visibility === 'AI_COLLECTABLE' || post.aiCollectable).length}
                </span>
                <span className="dash-stat-label">AI 수집</span>
              </div>
            </div>

            <section className="dash-section dash-section--full">
              <ActivityHeatmap posts={allNotes} />
            </section>

            <div className="dash-grid">
              <section className="dash-section">
                <h2 className="dash-section-title">최근 활동</h2>
                {latestNotes.length === 0 ? (
                  <p className="dash-empty">아직 노트가 없습니다.</p>
                ) : (
                  <ul className="dash-recent-list">
                    {latestNotes.map((post) => (
                      <li key={post.id}>
                        <button className="dash-recent-item" onClick={() => navigateToNote(post)}>
                          <span className="dash-recent-icon">📄</span>
                          <div className="dash-recent-info">
                            <span className="dash-recent-title">{post.title}</span>
                            <span className="dash-recent-date">
                              {formatDate(post.updatedAt || post.createdAt)}
                              {post.category && <span className="dash-recent-cat"> · {post.category.name}</span>}
                              <span className="dash-recent-readtime"> · {estimateReadTime(post.content)}분 읽기</span>
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="dash-section">
                <h2 className="dash-section-title">카테고리</h2>
                <div className="dash-cat-list">
                  {categoryStats.map((category) => (
                    <Link
                      key={category.id}
                      to="/notes/list"
                      className="dash-cat-card"
                      onClick={() => setCategoryId(String(category.id))}
                    >
                      <span className="dash-cat-icon">📂</span>
                      <span className="dash-cat-name">{category.name}</span>
                      <span className="dash-cat-count">{category.count}</span>
                    </Link>
                  ))}
                  {uncategorizedCount > 0 && (
                    <div className="dash-cat-card dash-cat-card--muted">
                      <span className="dash-cat-icon">📁</span>
                      <span className="dash-cat-name">미분류</span>
                      <span className="dash-cat-count">{uncategorizedCount}</span>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <section className="dash-section dash-section--full">
              <h2 className="dash-section-title">태그 클라우드</h2>
              {tags.length === 0 ? (
                <p className="dash-empty">태그가 없습니다.</p>
              ) : (
                <div className="dash-tag-cloud">
                  {tags.map((tag) => {
                    const count = tagCounts[tag.id] || 0
                    const sizeClass = count >= 5 ? 'lg' : count >= 2 ? 'md' : 'sm'
                    return (
                      <Link
                        key={tag.id}
                        to="/notes/list"
                        className={`dash-tag dash-tag--${sizeClass}`}
                        onClick={() => toggleTag(tag.id)}
                      >
                        #{tag.name}
                        <span className="dash-tag-count">{count}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>

            {recentNotes.length > 0 && (
              <section className="dash-section dash-section--full">
                <h2 className="dash-section-title">최근 열어본 파일</h2>
                <div className="dash-quick-list">
                  {recentNotes.map((post) => (
                    <Link key={post.id} to={`/notes/${post.id}`} className="dash-quick-item">
                      <span className="dash-quick-dot">·</span>
                      {post.title}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
