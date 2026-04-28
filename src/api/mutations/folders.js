import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createCategory,
  renameCategory,
  deleteCategory,
  moveCategory,
} from '../client'
import { queryKeys } from '../queries/keys'

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, parentId = null }) => createCategory(name, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
    },
  })
}

export function useRenameCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }) => renameCategory(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.lists() })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.lists() })
    },
  })
}

export function useMoveCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, parentId = null }) => moveCategory(id, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.lists() })
    },
  })
}
