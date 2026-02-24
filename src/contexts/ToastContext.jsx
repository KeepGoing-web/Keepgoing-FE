import { createContext, useContext, useState, useCallback, useRef, useMemo, useEffect } from 'react'
import './Toast.css'

const ToastContext = createContext(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})
  const idRef = useRef(0)

  /* Cleanup all timers on unmount */
  useEffect(() => {
    return () => Object.values(timers.current).forEach(clearTimeout)
  }, [])

  const removeToast = useCallback((id) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))
    timers.current[`exit_${id}`] = setTimeout(() => {
      delete timers.current[`exit_${id}`]
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 250)
  }, [])

  const addToast = useCallback((message, type = 'info', duration) => {
    const id = ++idRef.current
    const dur = duration ?? (type === 'error' ? 5000 : 3000)
    setToasts((prev) => {
      const next = [...prev, { id, message, type, exiting: false }]
      return next.length > 3 ? next.slice(-3) : next
    })
    timers.current[id] = setTimeout(() => removeToast(id), dur)
    return id
  }, [removeToast])

  const toast = useMemo(() => {
    const t = (message, type, duration) => addToast(message, type, duration)
    t.success = (msg, dur) => addToast(msg, 'success', dur)
    t.error   = (msg, dur) => addToast(msg, 'error', dur)
    t.warning = (msg, dur) => addToast(msg, 'warning', dur)
    t.info    = (msg, dur) => addToast(msg, 'info', dur)
    return t
  }, [addToast])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast--${t.type}${t.exiting ? ' toast--exit' : ''}`}
            role="status"
          >
            <span className="toast-icon">
              {t.type === 'success' && '✓'}
              {t.type === 'error' && '✕'}
              {t.type === 'warning' && '!'}
              {t.type === 'info' && 'i'}
            </span>
            <span className="toast-message">{t.message}</span>
            <button
              className="toast-close"
              onClick={() => removeToast(t.id)}
              aria-label="닫기"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
