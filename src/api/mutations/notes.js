import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createNote, updateNote, deleteNote, moveNote } from '../client'
import { getAuthGeneration } from '../http'
import { queryKeys } from '../queries/keys'

// Guard that skips cache writes when the auth session has changed (e.g. logout)
// between mutation start and callback. Prevents previous-user data from leaking
// into a fresh session's cache.
function isSameSession(capturedGeneration) {
  return getAuthGeneration() === capturedGeneration
}

export function useCreateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createNote,
    onMutate: () => ({ generationAtStart: getAuthGeneration() }),
    onSuccess: (_data, _variables, context) => {
      if (!isSameSession(context.generationAtStart)) return
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.list() })
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.all })
    },
  })
}

export function useUpdateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }) => updateNote(id, payload),
    onMutate: () => ({ generationAtStart: getAuthGeneration() }),
    onSuccess: (data, variables, context) => {
      if (!isSameSession(context.generationAtStart)) return
      const id = variables.id
      queryClient.setQueryData(queryKeys.notes.detail(id), (old) => {
        if (!data) return old
        return { ...(old ?? {}), ...data, id: data.id ?? old?.id ?? id }
      })
      // Background reconcile in case server response was partial
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.detail(id), exact: true })
      if (variables.payload?.folderId !== undefined || variables.payload?.categoryId !== undefined) {
        queryClient.invalidateQueries({ queryKey: queryKeys.categories.list() })
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.all })
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteNote,
    onMutate: async (id) => {
      const generationAtStart = getAuthGeneration()
      await queryClient.cancelQueries({ queryKey: queryKeys.notes.detail(id) })
      await queryClient.cancelQueries({ queryKey: queryKeys.notes.lists() })

      const detailSnapshot = queryClient.getQueryData(queryKeys.notes.detail(id))
      const listsSnapshot = queryClient.getQueriesData({ queryKey: queryKeys.notes.lists() })

      queryClient.setQueriesData({ queryKey: queryKeys.notes.lists() }, (old) => {
        if (!old) return old
        const list = Array.isArray(old.notes)
          ? old.notes
          : Array.isArray(old.posts)
            ? old.posts
            : null
        if (!list) return old
        const wasPresent = list.some((n) => String(n.id) === String(id))
        if (!wasPresent) return old
        const filterFn = (n) => String(n.id) !== String(id)
        return {
          ...old,
          notes: Array.isArray(old.notes) ? old.notes.filter(filterFn) : old.notes,
          posts: Array.isArray(old.posts) ? old.posts.filter(filterFn) : old.posts,
          total: typeof old.total === 'number' ? Math.max(0, old.total - 1) : old.total,
        }
      })

      return { detailSnapshot, listsSnapshot, generationAtStart }
    },
    onError: (err, id, context) => {
      if (!context || !isSameSession(context.generationAtStart)) return
      if (context.detailSnapshot !== undefined) {
        queryClient.setQueryData(queryKeys.notes.detail(id), context.detailSnapshot)
      }
      if (context.listsSnapshot) {
        context.listsSnapshot.forEach(([key, data]) => {
          queryClient.setQueryData(key, data)
        })
      }
    },
    onSuccess: (_data, id, context) => {
      if (!isSameSession(context?.generationAtStart)) return
      queryClient.removeQueries({ queryKey: queryKeys.notes.detail(id), exact: true })
    },
    onSettled: (_data, _err, _id, context) => {
      if (!isSameSession(context?.generationAtStart)) return
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.list() })
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.all })
    },
  })
}

export function useMoveNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, folderId }) => moveNote(id, folderId ?? null),
    onMutate: () => ({ generationAtStart: getAuthGeneration() }),
    onSuccess: (data, variables, context) => {
      if (!isSameSession(context.generationAtStart)) return
      const id = variables.id
      const nextFolderId = variables.folderId ?? null
      queryClient.setQueryData(queryKeys.notes.detail(id), (old) => {
        if (!data) return old
        const merged = { ...(old ?? {}), ...data, id: data.id ?? old?.id ?? id }
        return { ...merged, folderId: nextFolderId, categoryId: nextFolderId }
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.detail(id), exact: true })
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.list() })
    },
  })
}
