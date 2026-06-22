import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'

const apiMocks = vi.hoisted(() => ({
  login: vi.fn(),
  signup: vi.fn(),
  fetchMe: vi.fn(),
  updateMyProfile: vi.fn(),
  changeMyPassword: vi.fn(),
}))

vi.mock('../api/client', () => ({
  AUTH_SESSION_EXPIRED_EVENT: 'auth:session-expired',
  login: apiMocks.login,
  signup: apiMocks.signup,
  fetchMe: apiMocks.fetchMe,
  updateMyProfile: apiMocks.updateMyProfile,
  changeMyPassword: apiMocks.changeMyPassword,
}))

function renderWithAuthProvider(ui) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>,
  )
}

function SignupProbe() {
  const { signup, user, isAuthenticated, loading } = useAuth()

  return (
    <div>
      <div>{loading ? 'loading' : 'ready'}</div>
      <div>{isAuthenticated ? `authenticated:${user.name}` : 'anonymous'}</div>
      <button type="button" onClick={() => signup('test@example.com', 'P@ssword1!', '홍길동')}>
        signup
      </button>
    </div>
  )
}

function LoginProbe() {
  const { login, user, isAuthenticated, loading } = useAuth()

  return (
    <div>
      <div>{loading ? 'loading' : 'ready'}</div>
      <div>{isAuthenticated ? `authenticated:${user.name}` : 'anonymous'}</div>
      <button type="button" onClick={() => login('test@example.com', 'P@ssword1!')}>
        login
      </button>
    </div>
  )
}

async function resetRenderedSession() {
  await screen.findByText('ready')
  window.dispatchEvent(new CustomEvent('auth:session-expired'))
  await screen.findByText('anonymous')
  apiMocks.fetchMe.mockClear()
}

describe('AuthProvider signup flow', () => {
  beforeEach(() => {
    Object.values(apiMocks).forEach((mock) => mock.mockReset())
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('treats login as successful only after restoring the cookie-backed session user', async () => {
    apiMocks.login.mockResolvedValueOnce({ userId: 99, email: 'test@example.com', name: '응답사용자' })

    const user = userEvent.setup()
    renderWithAuthProvider(<LoginProbe />)
    await resetRenderedSession()

    apiMocks.fetchMe.mockResolvedValueOnce({ userId: 1, email: 'test@example.com', name: '세션사용자' })
    await user.click(screen.getByRole('button', { name: 'login' }))

    await waitFor(() => {
      expect(apiMocks.login).toHaveBeenCalledWith('test@example.com', 'P@ssword1!')
      expect(apiMocks.fetchMe).toHaveBeenCalledTimes(1)
    })
    expect(await screen.findByText('authenticated:세션사용자')).toBeInTheDocument()
  })

  it('logs in after signup and restores the cookie-backed session user', async () => {
    apiMocks.signup.mockResolvedValueOnce({ userId: 1, email: 'test@example.com', name: '홍길동' })
    apiMocks.login.mockResolvedValueOnce({ userId: 1, email: 'test@example.com', name: '홍길동' })

    const user = userEvent.setup()
    renderWithAuthProvider(<SignupProbe />)
    await resetRenderedSession()

    apiMocks.fetchMe.mockResolvedValueOnce({ userId: 1, email: 'test@example.com', name: '홍길동' })
    await user.click(screen.getByRole('button', { name: 'signup' }))

    await waitFor(() => {
      expect(apiMocks.signup).toHaveBeenCalledWith('test@example.com', 'P@ssword1!', '홍길동')
      expect(apiMocks.login).toHaveBeenCalledWith('test@example.com', 'P@ssword1!')
      expect(apiMocks.fetchMe).toHaveBeenCalledTimes(1)
    })
    expect(await screen.findByText('authenticated:홍길동')).toBeInTheDocument()
  })
})
