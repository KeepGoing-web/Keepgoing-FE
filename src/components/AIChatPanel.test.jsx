import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AIChatPanel from './AIChatPanel'

const mockSendAiPanelMessage = vi.fn()
const mockFetchNote = vi.fn()

vi.mock('../api/aiPanel', () => ({
  sendAiPanelMessage: (...args) => mockSendAiPanelMessage(...args),
}))

vi.mock('../api/client', () => ({
  fetchNote: (...args) => mockFetchNote(...args),
}))

describe('AIChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchNote.mockResolvedValue({ id: 42, title: '오늘 회의록' })
    mockSendAiPanelMessage.mockResolvedValue({
      assistantMessage: '백엔드와 연결되었습니다.',
      contextNoteId: null,
      contextAttached: false,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('submits an external query automatically after the panel opens', async () => {
    const onExternalRequestConsumed = vi.fn()

    render(
      <MemoryRouter>
        <AIChatPanel
          isOpen
          onClose={() => {}}
          externalRequest={{ id: 1, query: '최근 회의 내용을 요약해줘' }}
          onExternalRequestConsumed={onExternalRequestConsumed}
        />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(mockSendAiPanelMessage).toHaveBeenCalledWith({
        message: '최근 회의 내용을 요약해줘',
        contextNoteId: null,
      })
    })

    expect(onExternalRequestConsumed).toHaveBeenCalledTimes(1)
    expect(screen.getByText('최근 회의 내용을 요약해줘')).toBeInTheDocument()
    expect(await screen.findByText('백엔드와 연결되었습니다.')).toBeInTheDocument()
  })

  it('uses the current note route as panel context', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/notes/42']}>
        <AIChatPanel isOpen onClose={() => {}} />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(mockFetchNote).toHaveBeenCalledWith(42)
    })

    expect(screen.getAllByText(/오늘 회의록/).length).toBeGreaterThan(0)

    await user.type(screen.getByRole('textbox'), '핵심만 정리해줘')
    await user.click(screen.getByRole('button', { name: '전송' }))

    await waitFor(() => {
      expect(mockSendAiPanelMessage).toHaveBeenCalledWith({
        message: '핵심만 정리해줘',
        contextNoteId: 42,
      })
    })
  })
})
