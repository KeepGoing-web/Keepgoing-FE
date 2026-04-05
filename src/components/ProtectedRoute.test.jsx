import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import ProtectedRoute from './ProtectedRoute'

const mockUseAuth = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderRoute() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>private page</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>login page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('shows a loading fallback while auth state is resolving', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: true,
    })

    renderRoute()

    expect(screen.getByText('인증 상태를 확인하는 중...')).toBeInTheDocument()
  })

  it('redirects unauthenticated users to login', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
    })

    renderRoute()

    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('renders children for authenticated users', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
    })

    renderRoute()

    expect(screen.getByText('private page')).toBeInTheDocument()
  })
})
