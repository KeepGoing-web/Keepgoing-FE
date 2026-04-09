import { useState, useEffect, useCallback } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AIChatPanel from "./AIChatPanel";
import CommandPalette from "./CommandPalette";
import { OPEN_AI_PANEL_EVENT, buildRAGWorkspaceHref } from "../utils/ai";
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
  const [externalScope, setExternalScope] = useState(null);
  const [navOpen, setNavOpen] = useState(false);

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

  useEffect(() => { setNavOpen(false) }, [location.pathname]);

  const isActive = (path) => location.pathname.startsWith(path);
  const isNotesHome = location.pathname === "/notes";

  const toggleAiPanel = () => setAiPanelOpen((prev) => !prev);

  const handleAIQuery = useCallback((payload) => {
    const nextPayload = typeof payload === "string" ? { query: payload } : payload;

    if (isNotesHome) {
      navigate(buildRAGWorkspaceHref({ query: nextPayload?.query || "", scope: nextPayload?.scope || {} }));
      return;
    }

    setAiPanelOpen(true);
    setExternalQuery(nextPayload?.query || null);
    setExternalScope(nextPayload?.scope || null);
  }, [isNotesHome, navigate]);

  const handleExternalQueryConsumed = useCallback(() => {
    setExternalQuery(null);
    setExternalScope(null);
  }, []);

  useEffect(() => {
    if (isNotesHome && aiPanelOpen) {
      setAiPanelOpen(false);
    }
  }, [aiPanelOpen, isNotesHome]);

  useEffect(() => {
    const handleOpenAIPanel = (event) => {
      handleAIQuery(event.detail || {});
    };

    window.addEventListener(OPEN_AI_PANEL_EVENT, handleOpenAIPanel);
    return () => window.removeEventListener(OPEN_AI_PANEL_EVENT, handleOpenAIPanel);
  }, [handleAIQuery]);

  return (
    <div className="layout">
      <a href="#main-content" className="skip-to-content">본문으로 건너뛰기</a>
      <header className="header">
        <div className="header-content">
          <Link to="/notes" className="logo">
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
            <Link to="/notes" className={isActive("/notes") ? "active" : ""}>
              노트
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
            {!isNotesHome && (
              <button
                className={`ai-toggle-btn${aiPanelOpen ? " ai-toggle-btn--active" : ""}`}
                onClick={toggleAiPanel}
                title={aiPanelOpen ? "AI 패널 닫기" : "AI 패널 열기"}
                aria-label={aiPanelOpen ? "AI 패널 닫기" : "AI 패널 열기"}
                aria-pressed={aiPanelOpen}
              >
                ⬡
              </button>
            )}
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
              aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>
            <Link to="/settings/account" className="user-settings-link">
              설정
            </Link>
            <span className="user-name">{user?.name}</span>
            <button onClick={handleLogout} className="logout-btn">
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <div className="layout-body">
        <main id="main-content" className={`main-content${aiPanelOpen && !isNotesHome ? " main-content--panel-open" : ""}`}>
          <Outlet />
        </main>
        {!isNotesHome && (
          <AIChatPanel
            isOpen={aiPanelOpen}
            onClose={() => setAiPanelOpen(false)}
            externalQuery={externalQuery}
            externalScope={externalScope}
            onExternalQueryConsumed={handleExternalQueryConsumed}
          />
        )}
      </div>

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onAIQuery={handleAIQuery}
      />
    </div>
  );
};

export default Layout;
