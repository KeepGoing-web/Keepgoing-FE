import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import './ConfirmModal.css'

const ConfirmContext = createContext(null)

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null) // { message, resolve, title?, confirmLabel?, cancelLabel? }

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      setState({ message, resolve, ...options })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    state?.resolve(true)
    setState(null)
  }, [state])

  const handleCancel = useCallback(() => {
    state?.resolve(false)
    setState(null)
  }, [state])

  /* Close on Escape */
  useEffect(() => {
    if (!state) return
    const handleKey = (e) => {
      if (e.key === 'Escape') handleCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [state, handleCancel])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="confirm-overlay" onClick={handleCancel}>
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={state.title ? 'confirm-dialog-title' : undefined}
            onClick={(e) => e.stopPropagation()}
          >
            {state.title && (
              <h3 id="confirm-dialog-title" className="confirm-title">{state.title}</h3>
            )}
            <p className="confirm-message">{state.message}</p>
            <div className="confirm-actions">
              <button
                className="confirm-btn confirm-btn--cancel"
                onClick={handleCancel}
              >
                {state.cancelLabel || '취소'}
              </button>
              <button
                className="confirm-btn confirm-btn--confirm"
                onClick={handleConfirm}
                autoFocus
              >
                {state.confirmLabel || '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
