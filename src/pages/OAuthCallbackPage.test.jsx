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
    expect(screen.getByText('Google 계정을 확인하고 잠시 후 이동합니다.')).toBeInTheDocument()
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

  it('redirects to login with an error message when oauth login fails', async () => {
    const oauthLogin = vi.fn().mockRejectedValue(new Error('oauth failed'))
    mockUseAuth.mockReturnValue({ oauthLogin })

    render(<OAuthCallbackPage />)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        replace: true,
        state: {
          error: 'Google 로그인에 실패했습니다. 다시 시도해주세요.',
        },
      })
    })
  })
})
