import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AccountSettingsPage from './AccountSettingsPage'

const mockUseAuth = vi.fn()
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
}

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}))

function renderPage(overrides = {}) {
  const auth = {
    user: {
      email: 'test@example.com',
      name: '홍길동',
      role: 'USER',
    },
    updateProfile: vi.fn().mockResolvedValue({}),
    changePassword: vi.fn().mockResolvedValue({}),
    ...overrides,
  }

  mockUseAuth.mockReturnValue(auth)
  render(<AccountSettingsPage />)
  return auth
}

describe('AccountSettingsPage', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
    mockToast.success.mockReset()
    mockToast.error.mockReset()
  })

  it('updates the profile name through the auth context', async () => {
    const auth = renderPage()

    fireEvent.change(screen.getByDisplayValue('홍길동'), { target: { value: '김개발' } })
    fireEvent.click(screen.getByRole('button', { name: '프로필 저장' }))

    await waitFor(() => {
      expect(auth.updateProfile).toHaveBeenCalledWith('김개발')
    })

    expect(mockToast.success).toHaveBeenCalledWith('프로필을 저장했습니다.')
  })

  it('changes the password when the form is valid', async () => {
    const auth = renderPage()

    fireEvent.change(screen.getByLabelText('현재 비밀번호'), { target: { value: 'OldP@ssw0rd!' } })
    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'NewP@ssw0rd!' } })
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), { target: { value: 'NewP@ssw0rd!' } })
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    await waitFor(() => {
      expect(auth.changePassword).toHaveBeenCalledWith('OldP@ssw0rd!', 'NewP@ssw0rd!')
    })

    expect(mockToast.success).toHaveBeenCalledWith('비밀번호를 변경했습니다.')
  })

  it('shows a validation message when password confirmation does not match', async () => {
    const auth = renderPage()

    fireEvent.change(screen.getByLabelText('현재 비밀번호'), { target: { value: 'OldP@ssw0rd!' } })
    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'NewP@ssw0rd!' } })
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), { target: { value: 'Mismatch1!' } })
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    expect(await screen.findByText('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.')).toBeInTheDocument()
    expect(auth.changePassword).not.toHaveBeenCalled()
  })
})
