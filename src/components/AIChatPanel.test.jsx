import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import AIChatPanel from './AIChatPanel'

const mockQueryRAG = vi.fn()

vi.mock('../api/rag', () => ({
  queryRAG: (...args) => mockQueryRAG(...args),
  getRAGScopeLabel: () => '전체 지식베이스',
}))

describe('AIChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQueryRAG.mockResolvedValue({
      answer: {
        text: '백엔드 연동 전 단계입니다.',
        summary: '1개 문서를 기반으로 정리했습니다.',
      },
      sources: [{ id: '1', noteId: '1', title: '테스트', typeLabel: 'Memo', relevance: 0.9 }],
    })
  })

  it('submits an external query automatically after the panel opens', async () => {
    vi.useFakeTimers()

    const onExternalQueryConsumed = vi.fn()

    render(
      <MemoryRouter>
        <AIChatPanel
          isOpen
          onClose={() => {}}
          externalQuery="최근 노트 요약해줘"
          onExternalQueryConsumed={onExternalQueryConsumed}
        />
      </MemoryRouter>,
    )

    expect(onExternalQueryConsumed).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(500)
    })

    expect(screen.getByText('최근 노트 요약해줘')).toBeInTheDocument()
    expect(screen.getByText(/백엔드 연동 전 단계입니다/)).toBeInTheDocument()

    vi.useRealTimers()
  })
})
