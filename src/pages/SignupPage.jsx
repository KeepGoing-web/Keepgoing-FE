import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './LoginPage.css'

const SignupPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }

    setLoading(true)

    try {
      await signup(email, password, name)
      navigate('/login', { state: { message: '회원가입이 완료되었습니다. 로그인해주세요.' } })
    } catch (err) {
      if (err.code === 'USER_ALREADY_EXISTS') {
        setError('이미 가입된 이메일입니다.')
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
    <div className="login-page">
      <div className="login-container">
        <h1 className="login-title">Keepgoing</h1>
        <p className="login-subtitle">새 계정 만들기</p>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="name">이름</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="이름을 입력하세요"
              maxLength={50}
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="이메일을 입력하세요"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="비밀번호를 입력하세요 (8자 이상)"
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">비밀번호 확인</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="비밀번호를 다시 입력하세요"
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>
        <p className="auth-link">
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </div>
    </div>
  )
}

export default SignupPage
