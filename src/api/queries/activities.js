import { useQuery } from '@tanstack/react-query'
import { fetchMyActivities } from '../client'
import { queryKeys } from './keys'

export function useActivities(range, { enabled = true, ...options } = {}) {
  const hasRange = Boolean(range?.from && range?.to)
  return useQuery({
    queryKey: queryKeys.activities.range(range),
    queryFn: ({ signal }) => fetchMyActivities(range, { signal }),
    enabled: enabled && hasRange,
    staleTime: 5 * 60_000,
    ...options,
  })
}
