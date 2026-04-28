import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import OAuthCallbackPage from './OAuthCallbackPage'

const mockUseAuth = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('OAuthCallbackPage', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
    mockNavigate.mockReset()
  })

  it('shows the shared auth loading copy while oauth login is in progress', () => {
    mockUseAuth.mockReturnValue({
      oauthLogin: vi.fn(() => new Promise(() => {})),
    })

    render(<OAuthCallbackPage />)

    expect(screen.getByText('로그인 처리 중...')).toBeInTheDocument()
  })

  it('navigates to notes when oauth login succeeds', async () => {
    const oauthLogin = vi.fn().mockResolvedValue({})
    mockUseAuth.mockReturnValue({ oauthLogin })

    render(<OAuthCallbackPage />)

    await waitFor(() => {
      expect(oauthLogin).toHaveBeenCalledTimes(1)
      expect(mockNavigate).toHaveBeenCalledWith('/notes', { replace: true })
    })
  })

  it('redirects to login with the surfaced error message when oauth login fails', async () => {
    const oauthLogin = vi.fn().mockRejectedValue(new Error('oauth failed'))
    mockUseAuth.mockReturnValue({ oauthLogin })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<OAuthCallbackPage />)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        replace: true,
        state: {
          error: 'oauth failed',
        },
      })
    })

    expect(consoleError).toHaveBeenCalledWith('[oauth] login failed', expect.any(Error))
    consoleError.mockRestore()
  })
})
