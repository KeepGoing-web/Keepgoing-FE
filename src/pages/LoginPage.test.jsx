import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginPage from './LoginPage'

const mockUseAuth = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderPage({ authOverrides = {}, initialEntry = '/login' } = {}) {
  const auth = {
    login: vi.fn().mockResolvedValue({}),
    isAuthenticated: false,
    loading: false,
    ...authOverrides,
  }

  mockUseAuth.mockReturnValue(auth)

  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/notes" element={<div>notes page</div>} />
        <Route path="/signup" element={<div>signup page</div>} />
      </Routes>
    </MemoryRouter>,
  )

  return auth
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  it('renders the login form and oauth button', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Keepgoing' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Google로 계속하기' })).toBeInTheDocument()
    expect(screen.getByLabelText('이메일')).toBeInTheDocument()
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '회원가입' })).toBeInTheDocument()
  })

  it('shows inline field errors instead of submitting when the login form is empty', async () => {
    const user = userEvent.setup()
    const auth = renderPage()

    await user.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByText('이메일을 입력해주세요.')).toBeInTheDocument()
    expect(screen.getByText('비밀번호를 입력해주세요.')).toBeInTheDocument()
    expect(screen.getByLabelText('이메일')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('비밀번호')).toHaveAttribute('aria-invalid', 'true')
    expect(auth.login).not.toHaveBeenCalled()
  })

  it('shows a Korean inline message when the email format is invalid', async () => {
    const user = userEvent.setup()
    const auth = renderPage()

    await user.type(screen.getByLabelText('이메일'), 'invalid-email')
    await user.type(screen.getByLabelText('비밀번호'), 'P@ssword1!')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByText('올바른 이메일 주소를 입력해주세요.')).toBeInTheDocument()
    expect(screen.getByLabelText('이메일')).toHaveAttribute('aria-invalid', 'true')
    expect(auth.login).not.toHaveBeenCalled()
  })

  it('submits credentials and navigates to notes on success', async () => {
    const user = userEvent.setup()
    const auth = renderPage()

    await user.type(screen.getByLabelText('이메일'), 'test@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'P@ssword1!')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => {
      expect(auth.login).toHaveBeenCalledWith('test@example.com', 'P@ssword1!')
    })

    expect(await screen.findByText('notes page')).toBeInTheDocument()
  })

  it('shows the invalid credentials message from the auth error code', async () => {
    const user = userEvent.setup()
    renderPage({
      authOverrides: {
        login: vi.fn().mockRejectedValue({ code: 'AUTH_INVALID_CREDENTIALS' }),
      },
    })

    await user.type(screen.getByLabelText('이메일'), 'test@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByText('이메일 또는 비밀번호가 올바르지 않습니다.')).toBeInTheDocument()
  })

  it('redirects authenticated users to notes after auth restoration', async () => {
    renderPage({
      authOverrides: {
        isAuthenticated: true,
      },
    })

    expect(await screen.findByText('notes page')).toBeInTheDocument()
  })

  it('shows the signup success message passed through location state', () => {
    renderPage({
      initialEntry: {
        pathname: '/login',
        state: { message: '회원가입이 완료되었습니다. 로그인해주세요.' },
      },
    })

    expect(screen.getByText('회원가입이 완료되었습니다. 로그인해주세요.')).toBeInTheDocument()
  })
})
