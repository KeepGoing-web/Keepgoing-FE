import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Layout from './Layout'

const mockUseAuth = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('./AIChatPanel', () => ({
  default: () => <div data-testid="ai-chat-panel" />,
}))

vi.mock('./CommandPalette', () => ({
  default: () => <div data-testid="command-palette" />,
}))

vi.mock('../utils/ai', () => ({
  OPEN_AI_PANEL_EVENT: 'kg:test-open-ai-panel',
  buildRAGWorkspaceHref: () => '/query',
}))

function renderLayout(initialEntry = '/notes/list', authOverrides = {}) {
  const auth = {
    user: { name: '홍길동' },
    logout: vi.fn(),
    ...authOverrides,
  }

  mockUseAuth.mockReturnValue(auth)

  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="notes">
            <Route index element={<div>notes home</div>} />
            <Route path="list" element={<div>notes list</div>} />
          </Route>
          <Route path="query" element={<div>query page</div>} />
          <Route path="settings/account" element={<div>settings page</div>} />
        </Route>
        <Route path="/login" element={<div>login page</div>} />
      </Routes>
    </MemoryRouter>,
  )

  return auth
}

describe('Layout', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    localStorage.clear()
  })

  it('renders the shared notes navigation and user controls', () => {
    renderLayout()

    expect(screen.getByRole('link', { name: 'keepgoing' })).toHaveAttribute('href', '/notes')
    expect(screen.getByRole('link', { name: '노트' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'AI 질의' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '설정' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '검색 팔레트 열기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '라이트 모드로 전환' })).toBeInTheDocument()
  })

  it('logs out and navigates to login when the logout button is pressed', async () => {
    const user = userEvent.setup()
    const auth = renderLayout()

    await user.click(screen.getByRole('button', { name: '로그아웃' }))

    expect(auth.logout).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('login page')).toBeInTheDocument()
  })
})
