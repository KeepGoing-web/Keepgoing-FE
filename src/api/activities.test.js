import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchMyActivities, getRecentActivityRange } from './activities'

function mockJsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('activities api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('builds the recent activity range from the first day of the earliest visible month to today in KST', () => {
    expect(getRecentActivityRange(4, new Date('2026-04-17T12:00:00Z'))).toEqual({
      from: '2026-01-01',
      to: '2026-04-17',
    })
  })

  it('fetches my activities from the dashboard endpoint and normalizes calendar days', async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockJsonResponse({
        data: {
          from: '2026-01-01',
          to: '2026-04-17',
          timezone: 'Asia/Seoul',
          calendar: [
            { date: '2026-04-16', count: 2, level: 2 },
            { date: '2026-04-17', count: 6, level: 4 },
          ],
        },
      }),
    )

    const result = await fetchMyActivities({
      from: '2026-01-01',
      to: '2026-04-17',
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/activities/me/dashboard?from=2026-01-01&to=2026-04-17',
      expect.objectContaining({
        credentials: 'include',
        headers: {},
      }),
    )

    expect(result.calendar).toEqual([
      { date: '2026-04-16', count: 2, level: 2 },
      { date: '2026-04-17', count: 6, level: 4 },
    ])
  })
})
