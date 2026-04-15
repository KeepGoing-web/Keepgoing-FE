import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AuthField from '../components/auth/AuthField'
import AuthShell from '../components/auth/AuthShell'
import { useAuth } from '../contexts/AuthContext'

function validateSignupField(fieldName, values) {
  const trimmedName = values.name.trim()
  const trimmedEmail = values.email.trim()

  if (fieldName === 'name' && !trimmedName) {
    return '이름을 입력해주세요.'
  }

  if (fieldName === 'email') {
    if (!trimmedEmail) return '이메일을 입력해주세요.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return '올바른 이메일 주소를 입력해주세요.'
    }
  }

  if (fieldName === 'password') {
    if (!values.password) return '비밀번호를 입력해주세요.'
    if (values.password.length < 8) return '비밀번호는 8자 이상이어야 합니다.'
  }

  if (fieldName === 'confirmPassword') {
    if (!values.confirmPassword) return '비밀번호를 다시 입력해주세요.'
    if (values.password !== values.confirmPassword) {
      return '비밀번호가 일치하지 않습니다.'
    }
  }

  return ''
}

const SignupPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  const values = { name, email, password, confirmPassword }

  const setFieldValue = (fieldName, nextValue) => {
    if (fieldName === 'name') setName(nextValue)
    if (fieldName === 'email') setEmail(nextValue)
    if (fieldName === 'password') setPassword(nextValue)
    if (fieldName === 'confirmPassword') setConfirmPassword(nextValue)

    setFieldErrors((prev) => {
      if (!prev[fieldName]) return prev
      return {
        ...prev,
        [fieldName]: '',
      }
    })
  }

  const handleFieldBlur = (fieldName, nextValues = values) => {
    setFieldErrors((prev) => ({
      ...prev,
      [fieldName]: validateSignupField(fieldName, nextValues),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const nextFieldErrors = {
      name: validateSignupField('name', values),
      email: validateSignupField('email', values),
      password: validateSignupField('password', values),
      confirmPassword: validateSignupField('confirmPassword', values),
    }

    if (Object.values(nextFieldErrors).some(Boolean)) {
      setFieldErrors(nextFieldErrors)
      return
    }

    setLoading(true)

    try {
      await signup(email, password, name)
      navigate('/login', { state: { message: '회원가입이 완료되었습니다. 로그인해주세요.' } })
    } catch (err) {
      if (err.code === 'USER_ALREADY_EXISTS') {
        setFieldErrors((prev) => ({
          ...prev,
          email: '이미 가입된 이메일입니다.',
        }))
      } else if (err.code === 'VALIDATION_FAILED') {
        setError('입력 정보를 확인해주세요.')
      } else {
        setError(err.message || '회원가입에 실패했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell cardClassName="auth-card--signup" footer={<Link to="/login">로그인</Link>}>
      <form onSubmit={handleSubmit} className="auth-form auth-form--signup" noValidate>
        <AuthField
          id="name"
          label="이름"
          value={name}
          onChange={(e) => setFieldValue('name', e.target.value)}
          onBlur={() => handleFieldBlur('name')}
          placeholder="이름을 입력하세요"
          autoComplete="name"
          maxLength={50}
          error={fieldErrors.name}
        />
        <AuthField
          id="email"
          type="email"
          label="이메일"
          value={email}
          onChange={(e) => setFieldValue('email', e.target.value)}
          onBlur={() => handleFieldBlur('email')}
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
          onBlur={() => handleFieldBlur('password')}
          placeholder="비밀번호를 입력하세요 (8자 이상)"
          autoComplete="new-password"
          error={fieldErrors.password}
        />
        <AuthField
          id="confirmPassword"
          type="password"
          label="비밀번호 확인"
          value={confirmPassword}
          onChange={(e) => setFieldValue('confirmPassword', e.target.value)}
          onBlur={() => handleFieldBlur('confirmPassword')}
          placeholder="비밀번호를 다시 입력하세요"
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
        />
        {error ? (
          <div className="auth-feedback-slot" aria-live="polite">
            <div className="auth-message auth-message--error">{error}</div>
          </div>
        ) : null}
        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? '가입 중...' : '회원가입'}
        </button>
      </form>
    </AuthShell>
  )
}

export default SignupPage
