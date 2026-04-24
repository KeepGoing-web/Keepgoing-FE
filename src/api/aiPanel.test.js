import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sendAiPanelMessage } from './aiPanel'

function mockJsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('sendAiPanelMessage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('sends the panel message payload to the plural messages endpoint as application/json', async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockJsonResponse({
        data: {
          assistantMessage: '안녕하세요',
          contextNoteId: 42,
          contextAttached: true,
        },
      }),
    )

    await sendAiPanelMessage({ message: '요약해줘', contextNoteId: '42' })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/ai/panel/messages',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          message: '요약해줘',
          contextNoteId: 42,
        }),
      }),
    )
  })
})
