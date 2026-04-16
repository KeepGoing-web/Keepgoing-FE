import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from './DashboardPage'

const mockUseVault = vi.fn()

vi.mock('../contexts/VaultContext', () => ({
  useVault: () => mockUseVault(),
}))

vi.mock('../components/AIChatPanel', () => ({
  default: () => <div data-testid="dashboard-inline-ai" />,
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    mockUseVault.mockReset()
  })

  it('renders the shared recent-notes header actions for the empty state', () => {
    mockUseVault.mockReturnValue({
      allNotes: [],
      categoryStats: [],
      loading: false,
      navigateToNote: vi.fn(),
    })

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: '최근 노트' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '새 노트' })).toHaveAttribute('href', '/notes/write')
    expect(screen.getByRole('link', { name: '보관함' })).toHaveAttribute('href', '/notes/list')
  })
})
