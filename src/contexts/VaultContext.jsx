import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchBlogs, fetchCategories, fetchTags, createCategory as apiCreateCategory } from '../api/client'

/* ── localStorage helpers ─────────────────────────────── */

const RECENT_KEY = 'kg-recent-posts'
const RECENT_MAX = 5

function getRecentPosts() {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    /* Deduplicate by string-coerced id (guards against type mismatches) */
    const seen = new Set()
    return parsed.filter((p) => {
      const key = String(p.id)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  } catch { return [] }
}

function addRecentPostToStorage(post) {
  try {
    const prev = getRecentPosts().filter((p) => String(p.id) !== String(post.id))
    const next = [{ id: post.id, title: post.title }, ...prev].slice(0, RECENT_MAX)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    return next
  } catch { return getRecentPosts() }
}

/* ── Context ──────────────────────────────────────────── */

const VaultContext = createContext(null)

export function useVault() {
  const ctx = useContext(VaultContext)
  if (!ctx) throw new Error('useVault must be used within VaultProvider')
  return ctx
}

/** Safe version — returns null outside VaultProvider */
export function useVaultOptional() {
  return useContext(VaultContext)
}

export function VaultProvider({ children }) {
  const navigate = useNavigate()

  /* Shared data */
  const [allPosts, setAllPosts]       = useState([])
  const [categories, setCategories]   = useState([])
  const [tags, setTags]               = useState([])
  const [recentPosts, setRecentPosts] = useState(() => getRecentPosts())
  const [loading, setLoading]         = useState(true)

  /* Filter state (shared between sidebar & pages) */
  const [categoryId, setCategoryId]       = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState([])

  /* ── Fetch categories + tags ── */
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [catRes, tagRes] = await Promise.all([fetchCategories(), fetchTags()])
        setCategories(catRes.categories || [])
        setTags(tagRes.tags || [])
      } catch { /* non-blocking */ }
    }
    loadMeta()
  }, [])

  /* ── Fetch all posts for sidebar tree ── */
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      try {
        const res = await fetchBlogs({ page: 1, size: 200, sort: 'createdAt', order: 'desc' })
        const catRes = await fetchCategories()
        const cats = catRes.categories || []
        const postsWithCat = (res.posts || []).map((p) => ({
          ...p,
          category: cats.find((c) => c.id === (p.categoryId || p.category?.id)) || p.category || null,
        }))
        setAllPosts(postsWithCat)
      } catch { /* non-blocking */ }
      finally { setLoading(false) }
    }
    loadAll()
  }, [])

  /* ── Tag counts from allPosts ── */
  const tagCounts = allPosts.reduce((acc, p) => {
    if (Array.isArray(p.tags)) {
      p.tags.forEach((t) => { acc[t.id] = (acc[t.id] || 0) + 1 })
    }
    return acc
  }, {})

  /* ── Actions ── */

  const addRecentPost = useCallback((post) => {
    const next = addRecentPostToStorage(post)
    setRecentPosts(next)
  }, [])

  const navigateToPost = useCallback((post) => {
    addRecentPost(post)
    navigate(`/blogs/${post.id}`)
  }, [navigate, addRecentPost])

  const toggleTag = useCallback((tagId) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    )
  }, [])

  const removeTag = useCallback((tagId) => {
    setSelectedTagIds((prev) => prev.filter((id) => id !== tagId))
  }, [])

  const resetFilters = useCallback(() => {
    setCategoryId('')
    setSelectedTagIds([])
  }, [])

  /* Create a new category (directory) */
  const createCategory = useCallback(async (name, parentId = null) => {
    const newCat = await apiCreateCategory(name, parentId)
    setCategories((prev) => [...prev, newCat])
    return newCat
  }, [])

  /* Refresh posts (e.g. after creating/editing a post) */
  const refreshPosts = useCallback(async () => {
    try {
      const res = await fetchBlogs({ page: 1, size: 200, sort: 'createdAt', order: 'desc' })
      const catRes = await fetchCategories()
      const cats = catRes.categories || []
      const postsWithCat = (res.posts || []).map((p) => ({
        ...p,
        category: cats.find((c) => c.id === (p.categoryId || p.category?.id)) || p.category || null,
      }))
      setAllPosts(postsWithCat)
    } catch { /* non-blocking */ }
  }, [])

  const value = {
    /* Data */
    allPosts,
    categories,
    tags,
    recentPosts,
    tagCounts,
    loading,
    /* Filter state */
    categoryId,
    setCategoryId,
    selectedTagIds,
    setSelectedTagIds,
    /* Actions */
    addRecentPost,
    navigateToPost,
    toggleTag,
    removeTag,
    resetFilters,
    refreshPosts,
    createCategory,
  }

  return (
    <VaultContext.Provider value={value}>
      {children}
    </VaultContext.Provider>
  )
}
