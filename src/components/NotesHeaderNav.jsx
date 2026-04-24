import { Link } from 'react-router-dom'

const NotesHeaderNav = ({
  navOpen,
  onToggleNav,
  isActive,
  theme,
  onToggleTheme,
  onLogout,
  aiPanelOpen,
  onToggleAIPanel,
  onOpenCommandPalette,
}) => {
  return (
    <div className="header-content">
      <div className="header-main-group">
        <Link to="/notes" className="logo">
          keepgoing
        </Link>
        <span className="header-divider" aria-hidden="true" />
        <button
          className="nav-mobile-toggle"
          onClick={onToggleNav}
          aria-label="메뉴"
        >
          {navOpen ? '✕' : '☰'}
        </button>
        <nav className={`nav${navOpen ? ' nav--mobile-open' : ''}`}>
          <Link to="/notes" className={isActive('/notes') ? 'active' : ''}>
            노트
          </Link>
          <Link to="/query" className={isActive('/query') ? 'active' : ''}>
            AI 질의
          </Link>
        </nav>
      </div>
      <div className="user-menu">
        <button
          className={`cmd-trigger-btn cmd-trigger-btn--ai${aiPanelOpen ? ' cmd-trigger-btn--active' : ''}`}
          onClick={onToggleAIPanel}
          title={aiPanelOpen ? 'AI 패널 닫기' : 'AI 패널 열기'}
          aria-label={aiPanelOpen ? 'AI 패널 닫기' : 'AI 패널 열기'}
          aria-pressed={aiPanelOpen}
        >
          <span className="cmd-trigger-icon" aria-hidden="true">⬡</span>
          <span className="cmd-trigger-label">AI</span>
        </button>
        <button
          className="cmd-trigger-btn"
          onClick={onOpenCommandPalette}
          title="검색"
          aria-label="검색 팔레트 열기"
        >
          <span className="cmd-trigger-icon" aria-hidden="true">⌕</span>
          <kbd className="cmd-trigger-kbd">⌘K</kbd>
        </button>
        <button
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        <Link to="/settings/account" className="user-settings-link">
          설정
        </Link>
        <span className="header-divider" aria-hidden="true" />
        <button onClick={onLogout} className="logout-btn">
          로그아웃
        </button>
      </div>
    </div>
  )
}

export default NotesHeaderNav
