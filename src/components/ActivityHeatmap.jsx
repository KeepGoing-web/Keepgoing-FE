import { useMemo } from 'react'
import './ActivityHeatmap.css'

const KST_TIME_ZONE = 'Asia/Seoul'
const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const KST_PARTS_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: KST_TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
})

function getKSTParts(value) {
  const date = value instanceof Date ? value : new Date(value)
  const parts = KST_PARTS_FORMATTER.formatToParts(date)

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value || 0),
    month: Number(parts.find((part) => part.type === 'month')?.value || 0),
    day: Number(parts.find((part) => part.type === 'day')?.value || 0),
  }
}

function toDateKey({ year, month, day }) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getKSTDayOfWeek(parts) {
  const utcDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  return utcDate.getUTCDay()
}

function getDaysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function getMonthBlocks(referenceDate, months) {
  const { year, month } = getKSTParts(referenceDate)
  const blocks = []

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const monthIndex = month - 1 - offset
    const blockDate = new Date(year, monthIndex, 1)
    blocks.push({
      year: blockDate.getFullYear(),
      monthIndex: blockDate.getMonth(),
      monthNumber: blockDate.getMonth() + 1,
      label: MONTH_LABELS[blockDate.getMonth()],
    })
  }

  return blocks
}

function buildMonthWeeks(block, countMap) {
  const dayCount = getDaysInMonth(block.year, block.monthIndex)
  const firstDayOfWeek = getKSTDayOfWeek({ year: block.year, month: block.monthNumber, day: 1 })
  const cells = []

  for (let i = 0; i < firstDayOfWeek; i += 1) {
    cells.push(null)
  }

  for (let day = 1; day <= dayCount; day += 1) {
    const parts = { year: block.year, month: block.monthNumber, day }
    const key = toDateKey(parts)
    cells.push({
      count: countMap.get(key) || 0,
      date: key,
    })
  }

  while (cells.length % 7 !== 0) {
    cells.push(null)
  }

  const weeks = []
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7))
  }

  return weeks
}

function getLevel(count) {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  return 3
}

const ActivityHeatmap = ({ posts = [], months = 4 }) => {
  const { monthBlocks, totalRangeLabel } = useMemo(() => {
    const countMap = new Map()

    posts.forEach((post) => {
      const timestamps = [...new Set([post.createdAt, post.updatedAt].filter(Boolean))]
      timestamps.forEach((timestamp) => {
        const key = toDateKey(getKSTParts(timestamp))
        countMap.set(key, (countMap.get(key) || 0) + 1)
      })
    })

    const blocks = getMonthBlocks(new Date(), months).map((block) => ({
      ...block,
      weeks: buildMonthWeeks(block, countMap),
    }))

    return {
      monthBlocks: blocks,
      totalRangeLabel: `최근 ${months}개월`,
    }
  }, [months, posts])

  return (
    <div className="heatmap" role="img" aria-label={`${totalRangeLabel} 활동 캘린더`}>
      <div className="heatmap-topline">
        <span className="heatmap-total">{totalRangeLabel}</span>
      </div>

      <div className="heatmap-grid">
        {monthBlocks.map((block) => (
          <div key={`${block.year}-${block.monthNumber}`} className="heatmap-month-block">
            <span className="heatmap-month">{block.label}</span>
            <div className="heatmap-month-weeks">
              {block.weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="heatmap-col">
                  {week.map((cell, cellIndex) => (
                    <div
                      key={cell?.date || `${block.year}-${block.monthNumber}-${weekIndex}-${cellIndex}`}
                      className={`heatmap-cell heatmap-cell--${cell ? getLevel(cell.count) : 'empty'}`}
                      title={cell ? `${cell.date}: ${cell.count}개 활동` : undefined}
                      aria-label={cell ? `${cell.date}: ${cell.count}개 활동` : undefined}
                    />
                  ))}
                </div>
              ))}
            </div>
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
