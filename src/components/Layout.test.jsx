import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Layout from './Layout'

const mockUseAuth = vi.fn()
const mockAIChatPanel = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('./AIChatPanel', () => ({
  default: (props) => {
    mockAIChatPanel(props)
    return <div data-testid="ai-chat-panel" data-open={String(props.isOpen)} />
  },
}))

vi.mock('./CommandPalette', () => ({
  default: () => <div data-testid="command-palette" />,
}))

vi.mock('../utils/ai', () => ({
  OPEN_AI_PANEL_EVENT: 'kg:test-open-ai-panel',
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
    mockAIChatPanel.mockReset()
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
    expect(screen.getByRole('button', { name: 'AI 패널 열기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '검색 팔레트 열기' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '라이트 모드로 전환' })).toBeInTheDocument()
  })

  it('toggles the AI panel from the header button', async () => {
    const user = userEvent.setup()
    renderLayout()

    expect(mockAIChatPanel.mock.lastCall[0]).toEqual(expect.objectContaining({ isOpen: false }))

    await user.click(screen.getByRole('button', { name: 'AI 패널 열기' }))

    expect(mockAIChatPanel.mock.lastCall[0]).toEqual(expect.objectContaining({ isOpen: true }))
    expect(screen.getByRole('button', { name: 'AI 패널 닫기' })).toBeInTheDocument()
  })

  it('opens the AI panel and forwards an external request from the open-panel event', () => {
    renderLayout()

    act(() => {
      window.dispatchEvent(new CustomEvent('kg:test-open-ai-panel', {
        detail: {
          query: '이 문서 핵심만 정리해줘',
          contextNoteId: 7,
        },
      }))
    })

    expect(mockAIChatPanel.mock.lastCall[0]).toEqual(expect.objectContaining({
      isOpen: true,
      externalRequest: expect.objectContaining({
        query: '이 문서 핵심만 정리해줘',
        contextNoteId: 7,
      }),
    }))
  })

  it('logs out and navigates to login when the logout button is pressed', async () => {
    const user = userEvent.setup()
    const auth = renderLayout()

    await user.click(screen.getByRole('button', { name: '로그아웃' }))

    expect(auth.logout).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('login page')).toBeInTheDocument()
  })
})
