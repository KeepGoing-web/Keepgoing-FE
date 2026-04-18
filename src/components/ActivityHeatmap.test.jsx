import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ActivityHeatmap from './ActivityHeatmap'

describe('ActivityHeatmap', () => {
  it('renders a recent 4-month heatmap with month labels and legend', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-17T12:00:00Z'))

    render(
      <ActivityHeatmap
        posts={[
          { createdAt: '2026-04-17T09:00:00Z' },
          { createdAt: '2026-04-16T09:00:00Z' },
          { createdAt: '2026-04-03T09:00:00Z' },
          { createdAt: '2026-03-28T09:00:00Z' },
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

    vi.useRealTimers()
  })
})
