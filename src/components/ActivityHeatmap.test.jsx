import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ActivityHeatmap from './ActivityHeatmap'

describe('ActivityHeatmap', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders a recent 4-month heatmap with month labels and legend', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-17T12:00:00Z'))

    render(
      <ActivityHeatmap
        calendar={[
          { date: '2026-01-01', count: 0, level: 0 },
          { date: '2026-02-01', count: 0, level: 0 },
          { date: '2026-04-17', count: 1, level: 1 },
          { date: '2026-04-16', count: 2, level: 2 },
          { date: '2026-04-03', count: 4, level: 3 },
          { date: '2026-03-28', count: 6, level: 4 },
        ]}
      />,
    )

    expect(screen.getByText('최근 4개월')).toBeInTheDocument()
    expect(screen.getByText('1월')).toBeInTheDocument()
    expect(screen.getByText('2월')).toBeInTheDocument()
    expect(screen.getByText('3월')).toBeInTheDocument()
    expect(screen.getByText('4월')).toBeInTheDocument()
    expect(screen.getByText('적음')).toBeInTheDocument()
    expect(screen.getByText('많음')).toBeInTheDocument()
  })

  it('renders backend calendar activity counts when calendar data is provided', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-17T12:00:00Z'))

    render(
      <ActivityHeatmap
        calendar={[
          { date: '2026-04-16', count: 2, level: 2 },
          { date: '2026-04-17', count: 6, level: 4 },
        ]}
      />,
    )

    expect(screen.getByLabelText('2026-04-16: 2개 활동')).toBeInTheDocument()
    expect(screen.getByLabelText('2026-04-17: 6개 활동')).toBeInTheDocument()
  })

  it('does not render a weekday axis', () => {
    const { container } = render(
      <ActivityHeatmap
        calendar={[
          { date: '2026-01-01', count: 0, level: 0 },
          { date: '2026-04-17', count: 1, level: 1 },
        ]}
      />,
    )

    expect(container.querySelector('.heatmap-day-axis')).toBeNull()
  })
})
