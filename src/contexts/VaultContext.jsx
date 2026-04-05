import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchNotes, fetchCategories, fetchTags, createCategory as apiCreateCategory } from '../api/client'

const RECENT_KEY = 'kg-recent-notes'
const LEGACY_RECENT_KEY = 'kg-recent-posts'
const RECENT_MAX = 5

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
    const previousNotes = getRecentNotes().filter((recentPost) => String(recentPost.id) !== String(post.id))
    const nextNotes = [{ id: post.id, title: post.title }, ...previousNotes].slice(0, RECENT_MAX)
    localStorage.setItem(RECENT_KEY, JSON.stringify(nextNotes))
    return nextNotes
  } catch {
    return getRecentNotes()
  }
}

async function fetchVaultData() {
  const [postsResponse, categoryResponse, tagResponse] = await Promise.all([
    fetchNotes({ page: 1, size: 200, sort: 'createdAt', order: 'desc' }),
    fetchCategories(),
    fetchTags(),
  ])

  const categories = categoryResponse.categories || []
  const tags = tagResponse.tags || []
  const posts = (postsResponse.posts || []).map((post) => ({
    ...post,
    category: categories.find((category) => category.id === (post.categoryId || post.category?.id)) || post.category || null,
  }))

  return {
    posts,
    categories,
    tags,
  }
}

const VaultContext = createContext(null)

export function useVault() {
  const context = useContext(VaultContext)
  if (!context) throw new Error('useVault must be used within VaultProvider')
  return context
}

export function useVaultOptional() {
  return useContext(VaultContext)
}

export function VaultProvider({ children }) {
  const navigate = useNavigate()
  const [allNotes, setAllNotes] = useState([])
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  const [recentNotes, setRecentNotes] = useState(() => getRecentNotes())
  const [loading, setLoading] = useState(true)
  const [categoryId, setCategoryId] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState([])

  const hydrateVault = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchVaultData()
      setAllNotes(data.posts)
      setCategories(data.categories)
      setTags(data.tags)
    } catch {
      // non-blocking fetch failure; consumers render empty states
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void hydrateVault()
  }, [hydrateVault])

  const tagCounts = useMemo(
    () =>
      allNotes.reduce((counts, post) => {
        if (Array.isArray(post.tags)) {
          post.tags.forEach((tag) => {
            counts[tag.id] = (counts[tag.id] || 0) + 1
          })
        }
        return counts
      }, {}),
    [allNotes],
  )

  const categoryStats = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        count: allNotes.filter((post) => post.category && post.category.id === category.id).length,
      })),
    [allNotes, categories],
  )

  const addRecentNote = useCallback((post) => {
    const nextNotes = addRecentNoteToStorage(post)
    setRecentNotes(nextNotes)
  }, [])

  const navigateToNote = useCallback((post) => {
    addRecentNote(post)
    navigate(`/notes/${post.id}`)
  }, [addRecentNote, navigate])

  const toggleTag = useCallback((tagId) => {
    setSelectedTagIds((prev) => (
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    ))
  }, [])

  const removeTag = useCallback((tagId) => {
    setSelectedTagIds((prev) => prev.filter((id) => id !== tagId))
  }, [])

  const resetFilters = useCallback(() => {
    setCategoryId('')
    setSelectedTagIds([])
  }, [])

  const createCategory = useCallback(async (name, parentId = null) => {
    const nextCategory = await apiCreateCategory(name, parentId)
    setCategories((prev) => [...prev, nextCategory])
    return nextCategory
  }, [])

  const refreshNotes = useCallback(async () => {
    try {
      const data = await fetchVaultData()
      setAllNotes(data.posts)
      setCategories(data.categories)
      setTags(data.tags)
    } catch {
      // non-blocking refresh failure
    }
  }, [])

  const value = {
    allNotes,
    categories,
    categoryStats,
    tags,
    recentNotes,
    tagCounts,
    loading,
    categoryId,
    setCategoryId,
    selectedTagIds,
    setSelectedTagIds,
    addRecentNote,
    navigateToNote,
    toggleTag,
    removeTag,
    resetFilters,
    refreshNotes,
    createCategory,
  }

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}
