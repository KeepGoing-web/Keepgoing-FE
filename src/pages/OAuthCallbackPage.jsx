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

    oauthLogin()
      .then(() => navigate('/notes', { replace: true }))
      .catch(() => {
        navigate('/login', {
          replace: true,
          state: {
            error: 'Google 로그인에 실패했습니다. 다시 시도해주세요.',
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
