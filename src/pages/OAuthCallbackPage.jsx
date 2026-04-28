import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import '../components/auth/AuthShell.css'
import { useAuth } from '../contexts/AuthContext'

export default function OAuthCallbackPage() {
  const navigate = useNavigate()
  const { oauthLogin } = useAuth()
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    if (typeof window !== 'undefined') {
      const providerError = new URLSearchParams(window.location.search).get('error')
      if (providerError) {
        navigate('/login', {
          replace: true,
          state: { error: providerError },
        })
        return
      }
    }

    oauthLogin()
      .then(() => navigate('/notes', { replace: true }))
      .catch((error) => {
        console.error('[oauth] login failed', error)
        navigate('/login', {
          replace: true,
          state: {
            error: error?.code || error?.message || 'oauth_failed',
          },
        })
      })
  }, [navigate, oauthLogin])

  return (
    <div className="auth-callback-screen" role="status" aria-live="polite">
      <p className="auth-callback-text">로그인 처리 중...</p>
    </div>
  )
}
