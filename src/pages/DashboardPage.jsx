import { Link } from 'react-router-dom'
import { useVault } from '../contexts/VaultContext'
import { formatDate, estimateReadTime } from '../utils/format'
import LoadingDots from '../components/LoadingDots'
import './DashboardPage.css'

const VISIBILITY_LABELS = {
  PUBLIC: '공개',
  PRIVATE: '비공개',
  AI_COLLECTABLE: 'AI 수집',
}

const DashboardPage = () => {
  const { allNotes, recentNotes, loading, navigateToNote } = useVault()

  const latestNotes = [...allNotes]
    .sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt))
    .slice(0, 5)
  const aiReadyCount = allNotes.filter((note) => note.visibility === 'AI_COLLECTABLE' || note.aiCollectable).length
  const lastUpdatedAt = latestNotes[0]?.updatedAt || latestNotes[0]?.createdAt || null

  if (loading) {
    return (
      <div className="dash-page">
        <LoadingDots />
      </div>
    )
  }

  if (allNotes.length === 0) {
    return (
      <div className="dash-page dash-page--empty">
        <div className="dash-scroll">
          <div className="dash-welcome">
            <p className="dash-kicker">KEEPGOING NOTES</p>
            <h1 className="dash-welcome-title">첫 문서를 만들면 이 공간이 시작점이 됩니다</h1>
            <p className="dash-welcome-sub">
              왼쪽 패널은 탐색만 담당하고, 여기서는 바로 쓰거나 최근 문서를 다시 여는 데 집중합니다.
            </p>
            <div className="dash-welcome-actions">
              <Link to="/notes/write" className="dash-write-btn">새 노트 작성</Link>
              <Link to="/notes/list" className="dash-secondary-btn">라이브러리 열기</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dash-page">
      <div className="dash-scroll">
        <header className="dash-header">
          <div className="dash-header-copy">
            <p className="dash-kicker">START PAGE</p>
            <h1 className="dash-title">지금 이어서 작업할 문서</h1>
            <p className="dash-subtitle">
              최근 수정 문서를 다시 열고, 필요할 때만 새 문서를 시작하거나 RAG 질문으로 이어갑니다.
            </p>
          </div>
          <div className="dash-header-actions">
            <Link to="/notes/write" className="dash-write-btn">새 노트 작성</Link>
            <Link to="/query?scope=notes" className="dash-secondary-btn">RAG 질문</Link>
          </div>
        </header>

        <div className="dash-meta-line">
          <span>총 {allNotes.length}개 문서</span>
          <span>AI 준비 {aiReadyCount}개</span>
          <span>마지막 수정 {lastUpdatedAt ? formatDate(lastUpdatedAt) : '아직 없음'}</span>
        </div>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <div>
              <p className="dash-panel-kicker">CONTINUE</p>
              <h2 className="dash-panel-title">최근 작업한 문서</h2>
            </div>
          </div>

          <ul className="dash-document-list">
            {latestNotes.map((note) => (
              <li key={note.id}>
                <button className="dash-document-row" onClick={() => navigateToNote(note)}>
                  <div className="dash-document-main">
                    <div className="dash-document-topline">
                      <span className="dash-document-title">{note.title}</span>
                      <span className="dash-document-badge">{VISIBILITY_LABELS[note.visibility] || note.visibility}</span>
                    </div>
                    <p className="dash-document-preview">
                      {(note.content || '').replace(/\s+/g, ' ').slice(0, 96) || '본문이 아직 없습니다.'}
                    </p>
                  </div>
                  <div className="dash-document-meta">
                    <span>{formatDate(note.updatedAt || note.createdAt)}</span>
                    <span>{note.aiCollectable ? 'AI 준비됨' : '일반 문서'}</span>
                    <span>{estimateReadTime(note.content)}분 읽기</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <div className="dash-action-strip">
          <Link to="/notes/write" className="dash-action-pill">새 노트 작성</Link>
          <Link to="/notes/list" className="dash-action-pill">문서 라이브러리</Link>
          <Link to="/query?scope=notes" className="dash-action-pill">RAG 작업실</Link>
        </div>

        {recentNotes.length > 0 && (
          <section className="dash-panel dash-panel--compact">
            <div className="dash-panel-head">
              <div>
                <p className="dash-panel-kicker">RECENT</p>
                <h2 className="dash-panel-title">최근 열어본 문서</h2>
              </div>
            </div>
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
      </div>
    </div>
  )
}

export default DashboardPage
