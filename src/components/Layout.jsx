import { useState, useEffect, useCallback } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AIChatPanel from "./AIChatPanel";
import CommandPalette from "./CommandPalette";
import "./Layout.css";

const AI_PANEL_KEY = "kg-ai-panel-open";
const THEME_KEY = "kg-theme";

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch { /* ignore */ }
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState(getInitialTheme);

  const [aiPanelOpen, setAiPanelOpen] = useState(() => {
    try {
      return localStorage.getItem(AI_PANEL_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [externalQuery, setExternalQuery] = useState(null);
  const [navOpen, setNavOpen] = useState(false);

  /* ── Sync theme to <html> and localStorage ── */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  useEffect(() => {
    try {
      localStorage.setItem(AI_PANEL_KEY, String(aiPanelOpen));
    } catch {
      // ignore storage errors
    }
  }, [aiPanelOpen]);

  /* ── Global Cmd/Ctrl+K listener ── */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  /* Close mobile nav on route change */
  useEffect(() => { setNavOpen(false) }, [location.pathname]);

  const isActive = (path) => location.pathname.startsWith(path);

  const toggleAiPanel = () => setAiPanelOpen((prev) => !prev);

  /* AI query handoff from CommandPalette */
  const handleAIQuery = useCallback((query) => {
    setAiPanelOpen(true);
    setExternalQuery(query);
  }, []);

  /* Clear external query after AIChatPanel processes it */
  const handleExternalQueryConsumed = useCallback(() => {
    setExternalQuery(null);
  }, []);

  return (
    <div className="layout">
      <a href="#main-content" className="skip-to-content">본문으로 건너뛰기</a>
      <header className="header">
        <div className="header-content">
          <Link to="/blogs" className="logo">
            keepgoing
          </Link>
          <button
            className="nav-mobile-toggle"
            onClick={() => setNavOpen((v) => !v)}
            aria-label="메뉴"
          >
            {navOpen ? "✕" : "☰"}
          </button>
          <nav className={`nav${navOpen ? " nav--mobile-open" : ""}`}>
            <Link to="/blogs" className={isActive("/blogs") ? "active" : ""}>
              블로그
            </Link>
            <Link
              to="/explore"
              className={isActive("/explore") || isActive("/users") ? "active" : ""}
            >
              탐색
            </Link>
            <Link to="/query" className={isActive("/query") ? "active" : ""}>
              AI 질의
            </Link>
            <Link to="/resume" className={isActive("/resume") ? "active" : ""}>
              이력서
            </Link>
            <Link
              to="/applications"
              className={isActive("/applications") ? "active" : ""}
            >
              지원관리
            </Link>
          </nav>
          <div className="user-menu">
            <button
              className="cmd-trigger-btn"
              onClick={() => setCommandPaletteOpen(true)}
              title="검색 (Ctrl+K)"
              aria-label="검색 팔레트 열기"
            >
              ⌕ <kbd className="cmd-trigger-kbd">⌘K</kbd>
            </button>
            <button
              className={`ai-toggle-btn${aiPanelOpen ? " ai-toggle-btn--active" : ""}`}
              onClick={toggleAiPanel}
              title={aiPanelOpen ? "AI 패널 닫기" : "AI 패널 열기"}
              aria-label={aiPanelOpen ? "AI 패널 닫기" : "AI 패널 열기"}
              aria-pressed={aiPanelOpen}
            >
              ⬡
            </button>
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
              aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>
            <span className="user-name">{user?.name}</span>
            <button onClick={handleLogout} className="logout-btn">
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <div className="layout-body">
        <main id="main-content" className={`main-content${aiPanelOpen ? " main-content--panel-open" : ""}`}>
          <Outlet />
        </main>
        <AIChatPanel
          isOpen={aiPanelOpen}
          onClose={() => setAiPanelOpen(false)}
          externalQuery={externalQuery}
          onExternalQueryConsumed={handleExternalQueryConsumed}
        />
      </div>

      {/* Command Palette overlay */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onAIQuery={handleAIQuery}
      />
    </div>
  );
};

export default Layout;
