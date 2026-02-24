import { useMemo } from 'react'
import './ActivityHeatmap.css'

/**
 * GitHub-style activity heatmap for writing streak visualization.
 * Shows last 90 days of post creation activity.
 *
 * @param {Array} posts — array of posts with createdAt field
 * @param {number} [days=90] — number of days to display
 */
const ActivityHeatmap = ({ posts = [], days = 90 }) => {
  const { grid, streak, totalInPeriod } = useMemo(() => {
    const now = new Date()
    now.setHours(23, 59, 59, 999)

    /* Build a map of date-string → post count */
    const countMap = {}
    posts.forEach((p) => {
      const d = new Date(p.createdAt)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      countMap[key] = (countMap[key] || 0) + 1
    })

    /* Generate grid cells for the last N days */
    const cells = []
    let currentStreak = 0
    let streakBroken = false
    let total = 0

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      const count = countMap[key] || 0
      total += count

      cells.push({
        date: date.toISOString().split('T')[0],
        count,
        dayOfWeek: date.getDay(),
      })

      /* Calculate streak (consecutive days with posts, counting from today backwards) */
      if (i === 0 || !streakBroken) {
        if (count > 0) {
          currentStreak++
        } else if (i < 2) {
          /* Allow today to be 0 (day isn't over yet) */
          if (i !== 0) streakBroken = true
        } else {
          streakBroken = true
        }
      }
    }

    /* Group cells into weeks (columns) */
    const weeks = []
    let currentWeek = []
    cells.forEach((cell) => {
      if (cell.dayOfWeek === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek)
        currentWeek = []
      }
      currentWeek.push(cell)
    })
    if (currentWeek.length > 0) weeks.push(currentWeek)

    return { grid: weeks, streak: currentStreak, totalInPeriod: total }
  }, [posts, days])

  const getLevel = (count) => {
    if (count === 0) return 0
    if (count === 1) return 1
    if (count <= 3) return 2
    return 3
  }

  return (
    <div className="heatmap">
      <div className="heatmap-header">
        <div className="heatmap-streak">
          <span className="heatmap-streak-value">{streak}</span>
          <span className="heatmap-streak-label">일 연속 작성</span>
        </div>
        <span className="heatmap-total">최근 {days}일간 {totalInPeriod}개 포스트</span>
      </div>
      <div className="heatmap-grid" role="img" aria-label={`최근 ${days}일 활동 히트맵`}>
        {grid.map((week, wi) => (
          <div key={wi} className="heatmap-col">
            {week.map((cell) => (
              <div
                key={cell.date}
                className={`heatmap-cell heatmap-cell--${getLevel(cell.count)}`}
                title={`${cell.date}: ${cell.count}개 포스트`}
                aria-label={`${cell.date}: ${cell.count}개 포스트`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <span className="heatmap-legend-label">적음</span>
        <div className="heatmap-cell heatmap-cell--0" />
        <div className="heatmap-cell heatmap-cell--1" />
        <div className="heatmap-cell heatmap-cell--2" />
        <div className="heatmap-cell heatmap-cell--3" />
        <span className="heatmap-legend-label">많음</span>
      </div>
    </div>
  )
}

export default ActivityHeatmap
