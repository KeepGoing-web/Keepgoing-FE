import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SignupPage from './SignupPage'

const mockUseAuth = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

function LoginRedirectMessage() {
  const location = useLocation()
  return <div>{location.state?.message ?? 'login page'}</div>
}

function renderPage(authOverrides = {}) {
  const auth = {
    signup: vi.fn().mockResolvedValue({}),
    ...authOverrides,
  }

  mockUseAuth.mockReturnValue(auth)

  render(
    <MemoryRouter initialEntries={['/signup']}>
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginRedirectMessage />} />
      </Routes>
    </MemoryRouter>,
  )

  return auth
}

describe('SignupPage', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  it('shows the password length hint in the password placeholder', () => {
    renderPage()

    expect(screen.getByPlaceholderText('비밀번호를 입력하세요 (8자 이상)')).toBeInTheDocument()
  })

  it('shows inline required-field errors when the signup form is empty', async () => {
    const user = userEvent.setup()
    const auth = renderPage()

    await user.click(screen.getByRole('button', { name: '회원가입' }))

    expect(await screen.findByText('이름을 입력해주세요.')).toBeInTheDocument()
    expect(screen.getByText('이메일을 입력해주세요.')).toBeInTheDocument()
    expect(screen.getByText('비밀번호를 입력해주세요.')).toBeInTheDocument()
    expect(screen.getByText('비밀번호를 다시 입력해주세요.')).toBeInTheDocument()
    expect(screen.getByLabelText('이름')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('이메일')).toHaveAttribute('aria-invalid', 'true')
    expect(auth.signup).not.toHaveBeenCalled()
  })

  it('shows a field-level error and invalid style for an already registered email', async () => {
    const user = userEvent.setup()
    renderPage({
      signup: vi.fn().mockRejectedValue({ code: 'USER_ALREADY_EXISTS' }),
    })

    await user.type(screen.getByLabelText('이름'), '홍길동')
    await user.type(screen.getByLabelText('이메일'), 'test@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'P@ssword1!')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'P@ssword1!')
    await user.click(screen.getByRole('button', { name: '회원가입' }))

    expect(await screen.findByText('이미 가입된 이메일입니다.')).toBeInTheDocument()
    expect(screen.getByLabelText('이메일')).toHaveAttribute('aria-invalid', 'true')
  })

  it('prevents submit when passwords do not match', async () => {
    const user = userEvent.setup()
    const auth = renderPage()

    await user.type(screen.getByLabelText('이름'), '홍길동')
    await user.type(screen.getByLabelText('이메일'), 'test@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'P@ssword1!')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'Mismatch1!')
    await user.click(screen.getByRole('button', { name: '회원가입' }))

    expect(await screen.findByText('비밀번호가 일치하지 않습니다.')).toBeInTheDocument()
    expect(auth.signup).not.toHaveBeenCalled()
  })

  it('prevents submit when the password is shorter than eight characters', async () => {
    const user = userEvent.setup()
    const auth = renderPage()

    await user.type(screen.getByLabelText('이름'), '홍길동')
    await user.type(screen.getByLabelText('이메일'), 'test@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'short1!')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'short1!')
    await user.click(screen.getByRole('button', { name: '회원가입' }))

    expect(await screen.findByText('비밀번호는 8자 이상이어야 합니다.')).toBeInTheDocument()
    expect(auth.signup).not.toHaveBeenCalled()
  })

  it('submits a valid signup form and redirects to login with a success message', async () => {
    const user = userEvent.setup()
    const auth = renderPage()

    await user.type(screen.getByLabelText('이름'), '홍길동')
    await user.type(screen.getByLabelText('이메일'), 'test@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'P@ssword1!')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'P@ssword1!')
    await user.click(screen.getByRole('button', { name: '회원가입' }))

    await waitFor(() => {
      expect(auth.signup).toHaveBeenCalledWith('test@example.com', 'P@ssword1!', '홍길동')
    })

    expect(await screen.findByText('회원가입이 완료되었습니다. 로그인해주세요.')).toBeInTheDocument()
  })

  it('shows the already-registered email message from the auth error code', async () => {
    const user = userEvent.setup()
    renderPage({
      signup: vi.fn().mockRejectedValue({ code: 'USER_ALREADY_EXISTS' }),
    })

    await user.type(screen.getByLabelText('이름'), '홍길동')
    await user.type(screen.getByLabelText('이메일'), 'test@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'P@ssword1!')
    await user.type(screen.getByLabelText('비밀번호 확인'), 'P@ssword1!')
    await user.click(screen.getByRole('button', { name: '회원가입' }))

    expect(await screen.findByText('이미 가입된 이메일입니다.')).toBeInTheDocument()
  })
})
