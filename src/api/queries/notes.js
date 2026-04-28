import { useQuery } from '@tanstack/react-query'
import { fetchNote, fetchNotes } from '../client'
import { queryKeys } from './keys'

export function useNote(id, { enabled = true, ...rest } = {}) {
  return useQuery({
    queryKey: queryKeys.notes.detail(id),
    queryFn: ({ signal }) => fetchNote(id, { signal }),
    enabled: enabled && id != null && id !== '',
    staleTime: 60_000,
    ...rest,
  })
}

export function useNotes(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.notes.list(params),
    queryFn: ({ signal }) => fetchNotes(params, { signal }),
    staleTime: 30_000,
    ...options,
  })
}
