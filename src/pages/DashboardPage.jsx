import { Link } from 'react-router-dom'
import { useVault } from '../contexts/VaultContext'
import { formatDate, estimateReadTime } from '../utils/format'
import ActivityHeatmap from '../components/ActivityHeatmap'
import LoadingDots from '../components/LoadingDots'
import './DashboardPage.css'

const VISIBILITY_LABELS = {
  PUBLIC: '공개',
  PRIVATE: '비공개',
  AI_COLLECTABLE: 'AI 수집',
}

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

  const uncategorizedCount = allNotes.filter((note) => !note.category).length
  const latestNotes = [...allNotes]
    .sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt))
    .slice(0, 5)
  const aiReadyCount = allNotes.filter((note) => note.visibility === 'AI_COLLECTABLE' || note.aiCollectable).length
  const publicCount = allNotes.filter((note) => note.visibility === 'PUBLIC').length
  const lastUpdatedAt = latestNotes[0]?.updatedAt || latestNotes[0]?.createdAt || null

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
              <div className="dash-header-copy">
                <p className="dash-kicker">NOTE HUB</p>
                <h1 className="dash-title">노트 대시보드</h1>
                <p className="dash-subtitle">
                  최근 작성 흐름, 정리 상태, AI 활용 가능한 노트를 한 번에 확인하세요.
                </p>
              </div>
              <div className="dash-header-actions">
                <Link to="/notes/list" className="dash-secondary-btn">
                  전체 노트 보기
                </Link>
                <Link to="/notes/write" className="dash-write-btn">
                  <span>✦</span> 새 노트 작성
                </Link>
              </div>
            </div>

            <section className="dash-overview">
              <div className="dash-overview-main">
                <div className="dash-overview-card">
                  <span className="dash-overview-label">보관 중인 노트</span>
                  <strong>{allNotes.length}</strong>
                  <span className="dash-overview-meta">공개 {publicCount} · AI 수집 {aiReadyCount}</span>
                </div>
                <div className="dash-overview-card">
                  <span className="dash-overview-label">마지막 업데이트</span>
                  <strong>{lastUpdatedAt ? formatDate(lastUpdatedAt) : '아직 없음'}</strong>
                  <span className="dash-overview-meta">최근 수정된 노트에서 이어서 정리해보세요.</span>
                </div>
                <div className="dash-overview-card dash-overview-card--accent">
                  <span className="dash-overview-label">지금 추천 작업</span>
                  <strong>{latestNotes[0]?.title || '첫 노트 작성하기'}</strong>
                  <span className="dash-overview-meta">
                    {latestNotes[0]
                      ? '가장 최근 노트를 다듬거나 관련 노트를 이어서 작성해보세요.'
                      : '짧은 아이디어라도 바로 남겨두면 대시보드가 채워집니다.'}
                  </span>
                </div>
              </div>
            </section>

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
                  {aiReadyCount}
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
                    {latestNotes.map((note) => (
                      <li key={note.id}>
                        <button className="dash-recent-item" onClick={() => navigateToNote(note)}>
                          <span className="dash-recent-icon">📄</span>
                          <div className="dash-recent-info">
                            <div className="dash-recent-topline">
                              <span className="dash-recent-title">{note.title}</span>
                              <span className="dash-recent-badge">
                                {VISIBILITY_LABELS[note.visibility] || note.visibility}
                              </span>
                            </div>
                            <span className="dash-recent-preview">
                              {(note.content || '').replace(/\s+/g, ' ').slice(0, 96) || '본문이 아직 없습니다.'}
                            </span>
                            <span className="dash-recent-date">
                              {formatDate(note.updatedAt || note.createdAt)}
                              {note.category && <span className="dash-recent-cat"> · {note.category.name}</span>}
                              <span className="dash-recent-readtime"> · {estimateReadTime(note.content)}분 읽기</span>
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
                <h2 className="dash-section-title">최근 열어본 노트</h2>
                <div className="dash-quick-list">
                  {recentNotes.map((note) => (
                    <Link key={note.id} to={`/notes/${note.id}`} className="dash-quick-item">
                      <span className="dash-quick-dot">·</span>
                      {note.title}
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
