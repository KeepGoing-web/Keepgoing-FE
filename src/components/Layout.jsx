import { useState, useEffect, useCallback } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import AIChatPanel from "./AIChatPanel";
import CommandPalette from "./CommandPalette";
import NotesHeaderNav from "./NotesHeaderNav";
import { OPEN_AI_PANEL_EVENT } from "../utils/ai";
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
  const { logout } = useAuth();
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
  const [externalRequest, setExternalRequest] = useState(null);
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

  const handleAIQuery = useCallback((payload) => {
    const nextPayload = typeof payload === "string" ? { query: payload } : (payload || {});

    setAiPanelOpen(true);
    setExternalRequest(nextPayload.query
      ? {
          id: Date.now(),
          ...nextPayload,
        }
      : null);
  }, []);

  const handleExternalRequestConsumed = useCallback(() => {
    setExternalRequest(null);
  }, []);

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
        <NotesHeaderNav
          navOpen={navOpen}
          onToggleNav={() => setNavOpen((v) => !v)}
          isActive={isActive}
          theme={theme}
          onToggleTheme={toggleTheme}
          onLogout={handleLogout}
          aiPanelOpen={aiPanelOpen}
          onToggleAIPanel={() => setAiPanelOpen((prev) => !prev)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />
      </header>
      <div className="layout-body">
        <main id="main-content" className={`main-content${aiPanelOpen ? " main-content--panel-open" : ""}`}>
          <Outlet />
        </main>
        <AIChatPanel
          isOpen={aiPanelOpen}
          onClose={() => setAiPanelOpen(false)}
          externalRequest={externalRequest}
          onExternalRequestConsumed={handleExternalRequestConsumed}
        />
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
