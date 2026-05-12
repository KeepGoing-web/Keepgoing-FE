import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { attachCategoryMeta } from '../utils/notes'
import { queryKeys } from '../api/queries/keys'
import { useNotes } from '../api/queries/notes'
import { useCategories } from '../api/queries/categories'
import {
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useMoveNote,
} from '../api/mutations/notes'
import {
  useCreateCategory,
  useRenameCategory,
  useDeleteCategory,
  useMoveCategory,
} from '../api/mutations/folders'

const RECENT_KEY = 'kg-recent-notes'
const LEGACY_RECENT_KEY = 'kg-recent-posts'
const RECENT_MAX = 5
const VAULT_NOTES_PARAMS = { page: 1, size: 200, sort: 'createdAt', order: 'desc' }

function getRecentNotes() {
  try {
    const raw = localStorage.getItem(RECENT_KEY) || localStorage.getItem(LEGACY_RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const seen = new Set()
    return parsed.filter((post) => {
      const key = String(post.id)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  } catch {
    return []
  }
}

function addRecentNoteToStorage(post) {
  try {
    const previous = getRecentNotes().filter((p) => String(p.id) !== String(post.id))
    const next = [{ id: post.id, title: post.title }, ...previous].slice(0, RECENT_MAX)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    return next
  } catch {
    return getRecentNotes()
  }
}

function updateRecentNoteInStorage(post) {
  try {
    const next = getRecentNotes().map((r) =>
      String(r.id) === String(post.id) ? { ...r, title: post.title ?? r.title } : r,
    )
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    return next
  } catch {
    return getRecentNotes()
  }
}

function removeRecentNoteFromStorage(id) {
  try {
    const next = getRecentNotes().filter((r) => String(r.id) !== String(id))
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    return next
  } catch {
    return getRecentNotes()
  }
}

const VaultContext = createContext(null)

export function useVault() {
  const ctx = useContext(VaultContext)
  if (!ctx) throw new Error('useVault must be used within VaultProvider')
  return ctx
}

export function useVaultOptional() {
  return useContext(VaultContext)
}

export function VaultProvider({ children }) {
  const navigate = useNavigate()
  const [recentNotes, setRecentNotes] = useState(() => getRecentNotes())
  const [categoryId, setCategoryId] = useState('')
  const [notesRevision, setNotesRevision] = useState(0)

  const bumpRevision = useCallback(() => setNotesRevision((n) => n + 1), [])

  const notesQuery = useNotes(VAULT_NOTES_PARAMS)
  const categoriesQuery = useCategories()
  const loading = notesQuery.isLoading || categoriesQuery.isLoading

  const rawNotes = useMemo(
    () => notesQuery.data?.notes ?? notesQuery.data?.posts ?? [],
    [notesQuery.data],
  )
  const categories = useMemo(
    () => categoriesQuery.data?.categories ?? [],
    [categoriesQuery.data],
  )
  const allNotes = useMemo(
    () => attachCategoryMeta(rawNotes, categories),
    [rawNotes, categories],
  )
  const categoryStats = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        count: allNotes.filter(
          (post) => post.category && String(post.category.id) === String(category.id),
        ).length,
      })),
    [allNotes, categories],
  )

  const addRecentNote = useCallback((post) => {
    const next = addRecentNoteToStorage(post)
    setRecentNotes(next)
  }, [])

  const navigateToNote = useCallback(
    (post) => {
      addRecentNote(post)
      navigate(`/notes/${post.id}`)
    },
    [addRecentNote, navigate],
  )

  const resetFilters = useCallback(() => setCategoryId(''), [])

  const queryClient = useQueryClient()

  const refreshNotes = useCallback(async () => {
    // Invalidate activities so consumers (DashboardPage) refetch even when their
    // own staleTime hasn't elapsed yet — covers raw create/update flows that
    // bypass the typed mutation hooks.
    queryClient.invalidateQueries({ queryKey: queryKeys.activities.all })
    await Promise.all([notesQuery.refetch(), categoriesQuery.refetch()])
    bumpRevision()
  }, [queryClient, notesQuery, categoriesQuery, bumpRevision])

  const createCategoryMutation = useCreateCategory()
  const renameCategoryMutation = useRenameCategory()
  const deleteCategoryMutation = useDeleteCategory()
  const moveCategoryMutation = useMoveCategory()
  const createNoteMutation = useCreateNote()
  const moveNoteMutation = useMoveNote()
  const updateNoteMutation = useUpdateNote()
  const deleteNoteMutation = useDeleteNote()

  const createNote = useCallback(
    async (payload = {}) => {
      const defaultPayload = {
        title: '제목 없는 노트',
        content: '',
        visibility: 'PRIVATE',
        aiCollectable: true,
        ...payload,
      }
      const result = await createNoteMutation.mutateAsync(defaultPayload)
      addRecentNote(result)
      bumpRevision()
      navigate(`/notes/edit/${result.id}`)
      return result
    },
    [createNoteMutation, addRecentNote, bumpRevision, navigate],
  )

  const createCategory = useCallback(
    async (name, parentId = null) => {
      const result = await createCategoryMutation.mutateAsync({ name, parentId })
      bumpRevision()
      return result
    },
    [createCategoryMutation, bumpRevision],
  )

  const renameCategory = useCallback(
    async (id, name) => {
      const result = await renameCategoryMutation.mutateAsync({ id, name })
      bumpRevision()
      return result
    },
    [renameCategoryMutation, bumpRevision],
  )

  const deleteCategory = useCallback(
    async (id) => {
      const result = await deleteCategoryMutation.mutateAsync(id)
      bumpRevision()
      return result
    },
    [deleteCategoryMutation, bumpRevision],
  )

  const moveCategory = useCallback(
    async (id, parentId = null) => {
      const result = await moveCategoryMutation.mutateAsync({ id, parentId })
      bumpRevision()
      return result
    },
    [moveCategoryMutation, bumpRevision],
  )

  const moveNoteToFolder = useCallback(
    async (noteId, folderId = null) => {
      const result = await moveNoteMutation.mutateAsync({ id: noteId, folderId })
      bumpRevision()
      return result
    },
    [moveNoteMutation, bumpRevision],
  )

  const updateNote = useCallback(
    async (id, payload) => {
      const result = await updateNoteMutation.mutateAsync({ id, payload })
      const nextTitle = result?.title ?? payload?.title
      if (nextTitle !== undefined) {
        const next = updateRecentNoteInStorage({ id, title: nextTitle })
        setRecentNotes(next)
      }
      bumpRevision()
      return result
    },
    [updateNoteMutation, bumpRevision],
  )

  const deleteNote = useCallback(
    async (id) => {
      const result = await deleteNoteMutation.mutateAsync(id)
      const next = removeRecentNoteFromStorage(id)
      setRecentNotes(next)
      bumpRevision()
      return result
    },
    [deleteNoteMutation, bumpRevision],
  )

  const value = useMemo(
    () => ({
      allNotes,
      categories,
      categoryStats,
      recentNotes,
      loading,
      notesRevision,
      categoryId,
      setCategoryId,
      addRecentNote,
      navigateToNote,
      resetFilters,
      refreshNotes,
      createNote,
      createCategory,
      renameCategory,
      deleteCategory,
      moveCategory,
      moveNoteToFolder,
      updateNote,
      deleteNote,
    }),
    [
      allNotes,
      categories,
      categoryStats,
      recentNotes,
      loading,
      notesRevision,
      categoryId,
      setCategoryId,
      addRecentNote,
      navigateToNote,
      resetFilters,
      refreshNotes,
      createNote,
      createCategory,
      renameCategory,
      deleteCategory,
      moveCategory,
      moveNoteToFolder,
      updateNote,
      deleteNote,
    ],
  )

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}
