import { useEffect, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { GOOGLE_OAUTH_AUTHORIZE_URL } from '../api/client'
import AuthField from '../components/auth/AuthField'
import AuthShell from '../components/auth/AuthShell'
import GoogleOAuthButton from '../components/auth/GoogleOAuthButton'
import { useAuth } from '../contexts/AuthContext'

function validateLoginField(name, value) {
  const trimmedValue = value.trim()

  if (name === 'email') {
    if (!trimmedValue) return '이메일을 입력해주세요.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
      return '올바른 이메일 주소를 입력해주세요.'
    }
  }

  if (name === 'password' && !value) {
    return '비밀번호를 입력해주세요.'
  }

  return ''
}

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { login, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const successMessage = location.state?.message
  const oauthErrorMessage = location.state?.error

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/notes', { replace: true })
    }
  }, [authLoading, isAuthenticated, navigate])

  const setFieldValue = (fieldName, nextValue) => {
    if (fieldName === 'email') {
      setEmail(nextValue)
    }

    if (fieldName === 'password') {
      setPassword(nextValue)
    }

    setFieldErrors((prev) => {
      if (!prev[fieldName]) return prev
      return {
        ...prev,
        [fieldName]: '',
      }
    })
  }

  const handleFieldBlur = (fieldName, value) => {
    setFieldErrors((prev) => ({
      ...prev,
      [fieldName]: validateLoginField(fieldName, value),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const nextFieldErrors = {
      email: validateLoginField('email', email),
      password: validateLoginField('password', password),
    }

    if (Object.values(nextFieldErrors).some(Boolean)) {
      setFieldErrors(nextFieldErrors)
      return
    }

    setLoading(true)

    try {
      await login(email, password)
      navigate('/notes')
    } catch (err) {
      if (err.code === 'AUTH_INVALID_CREDENTIALS') {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      } else {
        setError(err.message || '로그인에 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = GOOGLE_OAUTH_AUTHORIZE_URL
  }

  if (authLoading) {
    return (
      <AuthShell cardClassName="auth-card--compact">
        <p className="auth-status-text">로그인 상태를 확인하고 있습니다...</p>
      </AuthShell>
    )
  }

  if (isAuthenticated) {
    return null
  }

  return (
    <AuthShell cardClassName="auth-card--login" footer={<Link to="/signup">회원가입</Link>}>
      <div className="auth-stack">
        <GoogleOAuthButton onClick={handleGoogleLogin} />
        <div className="auth-divider" aria-hidden="true" />
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <AuthField
            id="email"
            type="email"
            label="이메일"
            value={email}
            onChange={(e) => setFieldValue('email', e.target.value)}
            onBlur={() => handleFieldBlur('email', email)}
            placeholder="이메일을 입력하세요"
            autoComplete="email"
            error={fieldErrors.email}
          />
          <AuthField
            id="password"
            type="password"
            label="비밀번호"
            value={password}
            onChange={(e) => setFieldValue('password', e.target.value)}
            onBlur={() => handleFieldBlur('password', password)}
            placeholder="비밀번호를 입력하세요"
            autoComplete="current-password"
            error={fieldErrors.password}
          />
          {(successMessage || oauthErrorMessage || error) ? (
            <div className="auth-feedback-slot" aria-live="polite">
              {successMessage ? <div className="auth-message auth-message--success">{successMessage}</div> : null}
              {!error && oauthErrorMessage ? <div className="auth-message auth-message--error">{oauthErrorMessage}</div> : null}
              {error ? <div className="auth-message auth-message--error">{error}</div> : null}
            </div>
          ) : null}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </AuthShell>
  )
}

export default LoginPage
