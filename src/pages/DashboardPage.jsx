import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useVault } from '../contexts/VaultContext'
import { estimateReadTime, formatDate } from '../utils/format'
import LoadingDots from '../components/LoadingDots'
import AIChatPanel from '../components/AIChatPanel'
import './DashboardPage.css'

const HOME_SCOPE = {
  mode: 'all',
  currentNoteId: null,
  aiOnly: true,
}


const VISIBILITY_LABELS = {
  PUBLIC: '공개',
  PRIVATE: '비공개',
  AI_COLLECTABLE: '활용 가능',
}

const DashboardPage = () => {
  const { allNotes, categoryStats, loading, navigateToNote } = useVault()
  const [prompt, setPrompt] = useState('')
  const [inlineChatOpen, setInlineChatOpen] = useState(false)
  const [externalRequest, setExternalRequest] = useState(null)

  const latestNotes = useMemo(
    () => [...allNotes]
      .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0))
      .slice(0, 5),
    [allNotes],
  )

  const folderCount = useMemo(
    () => categoryStats.filter((category) => category.count > 0).length,
    [categoryStats],
  )

  const lastUpdatedAt = latestNotes[0]?.updatedAt || latestNotes[0]?.createdAt || null

  const openInlineChat = (query) => {
    const trimmed = String(query || '').trim()
    if (!trimmed) return

    setInlineChatOpen(true)
    setExternalRequest({ id: Date.now(), query: trimmed, scope: HOME_SCOPE })
    setPrompt('')
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    openInlineChat(prompt)
  }


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
          <div className="dash-empty-state">
            <p className="dash-kicker">노트</p>
            <h1 className="dash-title">노트가 아직 없습니다.</h1>
            <p className="dash-subtitle">새 노트를 만들면 여기서 바로 이어볼 수 있습니다.</p>
            <div className="dash-header-actions">
              <Link to="/notes/write" className="dash-write-btn">새 노트</Link>
              <Link to="/notes/list" className="dash-secondary-btn">보관함</Link>
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
            <p className="dash-kicker">노트</p>
            <h1 className="dash-title">최근 노트</h1>
            <p className="dash-subtitle">최근 수정한 노트를 확인합니다.</p>
          </div>
          <div className="dash-header-actions">
            <Link to="/notes/write" className="dash-write-btn">새 노트</Link>
            <Link to="/notes/list" className="dash-secondary-btn">보관함</Link>
          </div>
        </header>

        <div className="dash-meta-line">
          <span>총 {allNotes.length}개 노트</span>
          <span>폴더 {folderCount}개</span>
          <span>마지막 수정 {lastUpdatedAt ? formatDate(lastUpdatedAt) : '아직 없음'}</span>
        </div>

        <section className="dash-search" aria-label="찾기">
          <form className="dash-search-form" onSubmit={handleSubmit}>
            <input
              type="text"
              className="dash-search-input"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="검색어나 질문을 입력하세요"
              aria-label="검색 또는 질문"
            />
            <button type="submit" className="dash-search-submit" disabled={!prompt.trim()}>
              열기
            </button>
          </form>
        </section>

        {inlineChatOpen && (
          <section className="dash-inline-chat" aria-label="대화">
            <AIChatPanel
              variant="inline"
              title="대화"
              isOpen={inlineChatOpen}
              onClose={() => setInlineChatOpen(false)}
              externalRequest={externalRequest}
              onExternalRequestConsumed={() => setExternalRequest(null)}
              showScopeControls={false}
            />
          </section>
        )}

        <section className="dash-panel">
          <div className="dash-panel-head">
            <div>
              <p className="dash-panel-kicker">최근 업데이트</p>
              <h2 className="dash-panel-title">바로 이어서 볼 노트</h2>
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
                      {(note.content || '').replace(/\s+/g, ' ').slice(0, 120) || '본문이 아직 없습니다.'}
                    </p>
                  </div>
                  <div className="dash-document-meta">
                    <span>{formatDate(note.updatedAt || note.createdAt)}</span>
                    <span>{note.aiCollectable ? '활용 가능' : '일반 노트'}</span>
                    <span>{estimateReadTime(note.content)}분 읽기</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

export default DashboardPage
