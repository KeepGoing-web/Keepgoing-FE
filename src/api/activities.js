import { BASE_URL, USE_BACKEND_POSTS, USE_MOCK_API } from './config'
import { apiFetch, buildQuery, getAuthHeaders, handleResponse } from './http'

const KST_TIME_ZONE = 'Asia/Seoul'
const KST_PARTS_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: KST_TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
})

function getKSTParts(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  const parts = KST_PARTS_FORMATTER.formatToParts(date)

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value || 0),
    month: Number(parts.find((part) => part.type === 'month')?.value || 0),
    day: Number(parts.find((part) => part.type === 'day')?.value || 0),
  }
}

function toLocalDateString({ year, month, day }) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function calculateLevel(count) {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  if (count <= 5) return 3
  return 4
}

function normalizeCalendarDay(day) {
  const count = Number(day?.count ?? 0)

  return {
    date: String(day?.date ?? ''),
    count,
    level: Number.isFinite(day?.level) ? day.level : calculateLevel(count),
  }
}

function buildMockActivityCalendar(from, to) {
  const fromDate = new Date(`${from}T00:00:00+09:00`)
  const toDate = new Date(`${to}T00:00:00+09:00`)
  const calendar = []

  for (let cursor = fromDate; cursor <= toDate; cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)) {
    const date = toLocalDateString(getKSTParts(cursor))
    calendar.push({
      date,
      count: 0,
      level: 0,
    })
  }

  return calendar
}

export function getRecentActivityRange(months, referenceDate = new Date()) {
  const { year, month, day } = getKSTParts(referenceDate)
  let startYear = year
  let startMonth = month - (months - 1)

  while (startMonth <= 0) {
    startMonth += 12
    startYear -= 1
  }

  return {
    from: toLocalDateString({ year: startYear, month: startMonth, day: 1 }),
    to: toLocalDateString({ year, month, day }),
  }
}

export async function fetchMyActivities({ from, to }) {
  if (USE_MOCK_API && !USE_BACKEND_POSTS) {
    return {
      from,
      to,
      timezone: KST_TIME_ZONE,
      calendar: buildMockActivityCalendar(from, to),
    }
  }

  const query = buildQuery({ from, to })
  const res = await apiFetch(`${BASE_URL}/activities/me/dashboard${query}`, {
    headers: getAuthHeaders(),
  })
  const data = await handleResponse(res)
  const rawCalendar = Array.isArray(data) ? data : (data?.calendar || data?.activities || [])

  return {
    ...data,
    from: data?.from ?? from,
    to: data?.to ?? to,
    timezone: data?.timezone ?? KST_TIME_ZONE,
    calendar: rawCalendar.map(normalizeCalendarDay),
  }
}
