import { act, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import AIChatPanel from './AIChatPanel'

describe('AIChatPanel', () => {
  it('submits an external query automatically after the panel opens', async () => {
    vi.useFakeTimers()

    const onExternalQueryConsumed = vi.fn()

    render(
      <AIChatPanel
        isOpen
        onClose={() => {}}
        externalQuery="최근 노트 요약해줘"
        onExternalQueryConsumed={onExternalQueryConsumed}
      />,
    )

    expect(onExternalQueryConsumed).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(1900)
    })

    expect(screen.getByText('최근 노트 요약해줘')).toBeInTheDocument()
    expect(screen.getByText(/현재는 백엔드 연동 전 단계입니다/)).toBeInTheDocument()

    vi.useRealTimers()
  })
})
