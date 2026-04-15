import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthShell from '../components/auth/AuthShell'
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
    <AuthShell cardClassName="auth-card--compact">
      <p className="auth-status-text auth-status-text--strong">로그인 처리 중...</p>
      <p className="auth-status-text auth-status-text--muted">Google 계정을 확인하고 잠시 후 이동합니다.</p>
    </AuthShell>
  )
}
