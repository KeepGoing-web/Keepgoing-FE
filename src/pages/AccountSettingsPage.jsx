import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import './AccountSettingsPage.css'

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,64}$/

function getProfileErrorMessage(error) {
  if (error?.code === 'USER_NOT_FOUND') return '사용자 정보를 찾을 수 없습니다.'
  if (error?.code === 'VALIDATION_FAILED') return '이름은 비워둘 수 없으며 100자 이하여야 합니다.'
  return error?.message || '프로필 저장에 실패했습니다.'
}

function getPasswordErrorMessage(error) {
  if (error?.code === 'USER_CURRENT_PASSWORD_MISMATCH') return '현재 비밀번호가 올바르지 않습니다.'
  if (error?.code === 'USER_PASSWORD_CHANGE_NOT_SUPPORTED') return '이 계정은 비밀번호 변경을 지원하지 않습니다.'
  if (error?.code === 'INVALID_PASSWORD_FORMAT' || error?.code === 'VALIDATION_FAILED') {
    return '새 비밀번호는 8~64자이며 영문 대/소문자, 숫자, 특수문자(!@#$%^&*)를 포함해야 합니다.'
  }
  return error?.message || '비밀번호 변경에 실패했습니다.'
}

const AccountSettingsPage = () => {
  const { user, updateProfile, changePassword } = useAuth()
  const toast = useToast()

  const [name, setName] = useState(user?.name ?? '')
  const [profileError, setProfileError] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  useEffect(() => {
    setName(user?.name ?? '')
  }, [user?.name])

  const canSubmitProfile = useMemo(
    () => name.trim().length > 0 && name.trim() !== String(user?.name ?? '').trim(),
    [name, user?.name],
  )
  const loginMethodLabel = user?.email ? '이메일 로그인' : '소셜 로그인'

  const handleProfileSubmit = async (event) => {
    event.preventDefault()
    setProfileError('')

    const trimmedName = name.trim()
    if (!trimmedName) {
      setProfileError('이름을 입력해주세요.')
      return
    }

    setProfileSaving(true)
    try {
      await updateProfile(trimmedName)
      setName(trimmedName)
      toast.success('프로필을 저장했습니다.')
    } catch (error) {
      setProfileError(getProfileErrorMessage(error))
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    setPasswordError('')

    if (newPassword !== confirmPassword) {
      setPasswordError('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.')
      return
    }

    if (!PASSWORD_RULE.test(newPassword)) {
      setPasswordError('새 비밀번호는 8~64자이며 영문 대/소문자, 숫자, 특수문자(!@#$%^&*)를 포함해야 합니다.')
      return
    }

    setPasswordSaving(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('비밀번호를 변경했습니다.')
    } catch (error) {
      setPasswordError(getPasswordErrorMessage(error))
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <div className="account-settings-page">
      <div className="account-settings-shell">
        <header className="account-settings-header">
          <div>
            <h1>계정 설정</h1>
            <p className="account-settings-copy">수정 가능한 정보만 간단하게 정리해뒀습니다.</p>
          </div>
        </header>

        <section className="account-settings-card account-settings-card--stacked">
          <div className="account-settings-section">
            <div className="account-settings-card-head">
              <h2 id="profile-settings-title">프로필</h2>
            </div>

            <form className="account-settings-form" onSubmit={handleProfileSubmit}>
              <div className="account-settings-info">
                <span className="account-settings-info-label">이메일</span>
                <strong className="account-settings-info-value">{user?.email ?? '-'}</strong>
              </div>
              <div className="account-settings-info">
                <span className="account-settings-info-label">로그인 방식</span>
                <span className="account-settings-method-badge">● {loginMethodLabel}</span>
              </div>
              <label className="account-settings-field">
                <span>이름</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={100}
                  placeholder="이름을 입력하세요"
                />
              </label>

              {profileError ? <p className="account-settings-error">{profileError}</p> : null}

              <div className="account-settings-actions account-settings-actions--start">
                <button type="submit" className="account-settings-primary" disabled={!canSubmitProfile || profileSaving}>
                  {profileSaving ? '저장 중...' : '프로필 저장'}
                </button>
              </div>
            </form>
          </div>

          <div className="account-settings-divider" />

          <div className="account-settings-section">
            <div className="account-settings-card-head">
              <h2 id="password-settings-title">비밀번호 변경</h2>
              <p>이메일 로그인 계정만 비밀번호를 변경할 수 있습니다.</p>
            </div>

            <form className="account-settings-form" onSubmit={handlePasswordSubmit}>
              <label className="account-settings-field">
                <span>현재 비밀번호</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="현재 비밀번호"
                  required
                />
              </label>
              <label className="account-settings-field">
                <span>새 비밀번호</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="새 비밀번호"
                  required
                />
              </label>
              <label className="account-settings-field">
                <span>비밀번호 확인</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="새 비밀번호 확인"
                  required
                />
              </label>

              <p className="account-settings-hint">
                8~64자, 영문 대/소문자, 숫자, 특수문자를 포함해야 합니다.
              </p>

              {passwordError ? <p className="account-settings-error">{passwordError}</p> : null}

              <div className="account-settings-actions account-settings-actions--start">
                <button
                  type="submit"
                  className="account-settings-secondary"
                  disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                >
                  {passwordSaving ? '변경 중...' : '비밀번호 변경'}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}

export default AccountSettingsPage
