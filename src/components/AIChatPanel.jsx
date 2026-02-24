import { useState, useRef, useEffect, useCallback } from "react";
import "./AIChatPanel.css";

const WIDTH_KEY = "kg-ai-panel-width";
const MIN_WIDTH = 280;
const MAX_WIDTH = 700;
const DEFAULT_WIDTH = 360;

const AIChatPanel = ({ isOpen, onClose, externalQuery, onExternalQueryConsumed }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [panelWidth, setPanelWidth] = useState(() => {
    try {
      const saved = parseInt(localStorage.getItem(WIDTH_KEY), 10);
      return saved >= MIN_WIDTH && saved <= MAX_WIDTH ? saved : DEFAULT_WIDTH;
    } catch {
      return DEFAULT_WIDTH;
    }
  });
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen]);

  /* ── Handle external query from CommandPalette ── */
  useEffect(() => {
    if (!externalQuery || !isOpen) return;
    setInput(externalQuery);
    onExternalQueryConsumed?.();
    // Auto-submit after a short delay to allow panel animation
    const timer = setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} };
      // Directly trigger submit logic
      const question = externalQuery.trim();
      if (!question || loading) return;
      setInput("");
      setLoading(true);
      const userMsg = {
        id: Date.now().toString(),
        role: "user",
        content: question,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      (async () => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const assistantMsg = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `"${question}"에 대한 답변입니다.\n\n실제로는 RAG 시스템을 통해 작성한 포스트들을 기반으로 맥락에 맞는 답변을 생성합니다. 현재는 백엔드 연동 전 단계입니다.`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
        } catch (err) {
          console.error("AI 응답 실패:", err);
        } finally {
          setLoading(false);
        }
      })();
    }, 400);
    return () => clearTimeout(timer);
  }, [externalQuery, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Resize handlers ── */
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleResizeMove = (e) => {
      const newWidth = window.innerWidth - e.clientX;
      const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth));
      setPanelWidth(clamped);
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      try {
        localStorage.setItem(WIDTH_KEY, String(panelWidth));
      } catch {}
    };

    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, panelWidth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput("");
    setLoading(true);

    const userMsg = {
      id: Date.now().toString(),
      role: "user",
      content: question,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `"${question}"에 대한 답변입니다.\n\n실제로는 RAG 시스템을 통해 작성한 포스트들을 기반으로 맥락에 맞는 답변을 생성합니다. 현재는 백엔드 연동 전 단계입니다.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("AI 응답 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTime = (date) =>
    date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

  return (
    <aside
      ref={panelRef}
      className={`ai-chat-panel${isOpen ? " ai-chat-panel--open" : ""}${isResizing ? " ai-chat-panel--resizing" : ""}`}
      style={isOpen ? { width: panelWidth, minWidth: panelWidth } : undefined}
    >
      {/* Resize handle */}
      <div
        className="ai-resize-handle"
        onMouseDown={handleResizeStart}
        title="드래그하여 크기 조절"
        aria-label="패널 크기 조절"
      >
        <div className="ai-resize-handle-bar" />
      </div>
      <div className="ai-panel-header">
        <div className="ai-panel-title">
          <span className="ai-panel-icon">⬡</span>
          <span>AI 어시스턴트</span>
        </div>
        <div className="ai-panel-actions">
          {messages.length > 0 && (
            <button
              className="ai-panel-clear"
              onClick={handleClear}
              title="대화 초기화"
              aria-label="대화 초기화"
            >
              초기화
            </button>
          )}
          <button
            className="ai-panel-close"
            onClick={onClose}
            title="패널 닫기"
            aria-label="AI 패널 닫기"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="ai-messages" role="log" aria-live="polite">
        {messages.length === 0 && !loading ? (
          <div className="ai-empty-state">
            <div className="ai-empty-icon">⬡</div>
            <p className="ai-empty-title">무엇이든 물어보세요</p>
            <p className="ai-empty-desc">
              작성한 포스트를 기반으로 질문에 답변합니다.
            </p>
            <ul className="ai-empty-suggestions">
              <li
                className="ai-suggestion"
                onClick={() =>
                  setInput("이 노트에서 핵심 개념 3개를 정리해줘")
                }
              >
                핵심 개념 정리해줘
              </li>
              <li
                className="ai-suggestion"
                onClick={() =>
                  setInput("최근 작성한 포스트 요약해줘")
                }
              >
                최근 포스트 요약
              </li>
              <li
                className="ai-suggestion"
                onClick={() =>
                  setInput("내 기술 스택을 분석해줘")
                }
              >
                기술 스택 분석
              </li>
            </ul>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`ai-message ai-message--${msg.role}`}
            >
              <div className="ai-message-bubble">
                <p className="ai-message-content">{msg.content}</p>
              </div>
              <span className="ai-message-time">{formatTime(msg.timestamp)}</span>
            </div>
          ))
        )}

        {loading && (
          <div className="ai-message ai-message--assistant">
            <div className="ai-message-bubble ai-message-bubble--loading">
              <div className="ai-loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="ai-input-form" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          className="ai-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="질문 입력... (Enter 전송, Shift+Enter 줄바꿈)"
          disabled={loading}
          rows={1}
          aria-label="AI에게 질문하기"
        />
        <button
          type="submit"
          className="ai-send-btn"
          disabled={loading || !input.trim()}
          aria-label="전송"
        >
          →
        </button>
      </form>
    </aside>
  );
};

export default AIChatPanel;
