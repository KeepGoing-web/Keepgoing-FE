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

function fromDateKey(dateKey) {
  const [year, month, day] = String(dateKey).split('-').map(Number)
  return { year, month, day }
}

function toUTCDate(parts) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
}

function fromUTCDate(date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

function shiftDate(parts, offsetDays) {
  const nextDate = toUTCDate(parts)
  nextDate.setUTCDate(nextDate.getUTCDate() + offsetDays)
  return fromUTCDate(nextDate)
}

function getKSTDayOfWeek(parts) {
  return toUTCDate(parts).getUTCDay()
}

function getLevel(count) {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  if (count <= 5) return 3
  return 4
}

function buildFallbackRange(months) {
  const todayParts = getKSTParts(new Date())
  let startYear = todayParts.year
  let startMonth = todayParts.month - (months - 1)

  while (startMonth <= 0) {
    startMonth += 12
    startYear -= 1
  }

  return {
    from: { year: startYear, month: startMonth, day: 1 },
    to: todayParts,
  }
}

function buildContinuousGrid(calendar, months) {
  const countMap = new Map()

  calendar.forEach((day) => {
    if (!day?.date) return
    const count = Number(day.count || 0)
    countMap.set(String(day.date), {
      count,
      level: typeof day.level === 'number' ? day.level : getLevel(count),
    })
  })

  const sortedDates = [...countMap.keys()].sort()
  const fallbackRange = buildFallbackRange(months)
  const rangeStart = sortedDates[0] ? fromDateKey(sortedDates[0]) : fallbackRange.from
  const rangeEnd = sortedDates.at(-1) ? fromDateKey(sortedDates.at(-1)) : fallbackRange.to
  const rangeStartKey = toDateKey(rangeStart)
  const rangeEndKey = toDateKey(rangeEnd)

  const gridStart = shiftDate(rangeStart, -getKSTDayOfWeek(rangeStart))
  const gridEnd = shiftDate(rangeEnd, 6 - getKSTDayOfWeek(rangeEnd))

  const weeks = []
  let cursor = gridStart

  while (toDateKey(cursor) <= toDateKey(gridEnd)) {
    const week = []

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const key = toDateKey(cursor)
      const inRange = key >= rangeStartKey && key <= rangeEndKey
      const activity = countMap.get(key)

      week.push(
        inRange
          ? {
              date: key,
              count: activity?.count || 0,
              level: activity?.level ?? 0,
            }
          : null,
      )

      cursor = shiftDate(cursor, 1)
    }

    weeks.push(week)
  }

  const monthLabels = []
  let previousMonthKey = null

  weeks.forEach((week, index) => {
    const firstDayInWeek = week.find(Boolean)
    if (!firstDayInWeek) return

    const parts = fromDateKey(firstDayInWeek.date)
    const monthKey = `${parts.year}-${parts.month}`

    if (monthKey !== previousMonthKey) {
      monthLabels.push({
        column: index + 1,
        label: MONTH_LABELS[parts.month - 1],
      })
      previousMonthKey = monthKey
    }
  })

  return {
    weeks,
    monthLabels,
  }
}

const ActivityHeatmap = ({ calendar = [], months = 4 }) => {
  const todayKey = toDateKey(getKSTParts(new Date()))

  const { monthLabels, totalRangeLabel, weeks } = useMemo(() => {
    const grid = buildContinuousGrid(calendar, months)

    return {
      monthLabels: grid.monthLabels,
      totalRangeLabel: `최근 ${months}개월`,
      weeks: grid.weeks,
    }
  }, [calendar, months])

  return (
    <div className="heatmap" role="img" aria-label={`${totalRangeLabel} 활동 캘린더`}>
      <div className="heatmap-topline">
        <span className="heatmap-total">{totalRangeLabel}</span>
      </div>

      <div className="heatmap-board" style={{ '--heatmap-columns': weeks.length }}>
        <div className="heatmap-month-grid">
          {monthLabels.map((item) => (
            <span key={`${item.label}-${item.column}`} className="heatmap-month" style={{ gridColumn: `${item.column} / span 1` }}>
              {item.label}
            </span>
          ))}
        </div>

        <div className="heatmap-week-grid">
          {weeks.map((week, weekIndex) => (
            <div key={`week-${weekIndex}`} className="heatmap-week-col">
              {week.map((cell, cellIndex) => (
                <div
                  key={cell?.date || `blank-${weekIndex}-${cellIndex}`}
                  className={[
                    'heatmap-cell',
                    cell ? `heatmap-cell--${cell.level}` : 'heatmap-cell--outside',
                    cell?.date === todayKey ? 'heatmap-cell--today' : '',
                  ].filter(Boolean).join(' ')}
                  title={cell ? `${cell.date}: ${cell.count}개 활동` : undefined}
                  aria-label={cell ? `${cell.date}: ${cell.count}개 활동` : undefined}
                  aria-hidden={cell ? undefined : 'true'}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="heatmap-legend">
        <span className="heatmap-legend-label">적음</span>
        <div className="heatmap-cell heatmap-cell--0" />
        <div className="heatmap-cell heatmap-cell--1" />
        <div className="heatmap-cell heatmap-cell--2" />
        <div className="heatmap-cell heatmap-cell--3" />
        <div className="heatmap-cell heatmap-cell--4" />
        <span className="heatmap-legend-label">많음</span>
      </div>
    </div>
  )
}

export default ActivityHeatmap
