import { useQuery } from '@tanstack/react-query'
import { fetchCategories } from '../client'
import { queryKeys } from './keys'

export function useCategories(params, options = {}) {
  const baseKey = queryKeys.categories.list()
  return useQuery({
    queryKey: params ? [...baseKey, params] : baseKey,
    queryFn: ({ signal }) => fetchCategories(params, { signal }),
    staleTime: 5 * 60_000,
    ...options,
  })
}
