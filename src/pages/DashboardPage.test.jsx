import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from './DashboardPage'

const mockUseVault = vi.fn()

vi.mock('../contexts/VaultContext', () => ({
  useVault: () => mockUseVault(),
}))

function buildNote(overrides = {}) {
  return {
    id: 'note-1',
    title: '할 일 노트',
    content: '# 제목\n- [ ] 첫 번째 작업\n- [ ] 두 번째 작업',
    createdAt: '2026-04-10T10:00:00Z',
    updatedAt: '2026-04-11T10:00:00Z',
    visibility: 'PUBLIC',
    aiCollectable: true,
    ...overrides,
  }
}

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

  it('renders activity, todo, and recent-notes sections in order', () => {
    mockUseVault.mockReturnValue({
      allNotes: [buildNote(), buildNote({ id: 'note-2', title: '최근 노트', content: '본문', updatedAt: '2026-04-12T10:00:00Z' })],
      loading: false,
      navigateToNote: vi.fn(),
    })

    const { container } = render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    const activity = screen.getByRole('heading', { name: '활동 캘린더' })
    const todo = screen.getByRole('heading', { name: 'TODO' })

    const order = [activity, todo].map((node) => container.innerHTML.indexOf(node.textContent))
    expect(order[0]).toBeLessThan(order[1])
    expect(screen.queryByRole('heading', { name: '최근 노트' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '노트 목록' })).not.toBeInTheDocument()
    expect(screen.getByText('ACTIVITY')).toBeInTheDocument()
    expect(screen.getByText('최근 4개월')).toBeInTheDocument()
    expect(screen.getByText('첫 번째 작업')).toBeInTheDocument()
    expect(screen.getByText(/개 진행 중/)).toBeInTheDocument()
  })

  it('navigates to the source note when a todo row is clicked', async () => {
    const user = userEvent.setup()
    const navigateToNote = vi.fn()

    mockUseVault.mockReturnValue({
      allNotes: [buildNote()],
      loading: false,
      navigateToNote,
    })

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    const todoSection = screen.getByRole('heading', { name: 'TODO' }).closest('section')
    await user.click(within(todoSection).getByRole('button', { name: /첫 번째 작업/i }))

    expect(navigateToNote).toHaveBeenCalledWith(expect.objectContaining({
      id: 'note-1',
      title: '할 일 노트',
    }))
  })
})
