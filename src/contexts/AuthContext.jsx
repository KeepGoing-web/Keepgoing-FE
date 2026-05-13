import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  AUTH_SESSION_EXPIRED_EVENT,
  login as apiLogin,
  signup as apiSignup,
  fetchMe,
  updateMyProfile as apiUpdateMyProfile,
  changeMyPassword as apiChangeMyPassword,
} from '../api/client'
import { bumpAuthGeneration } from '../api/http'

const AuthContext = createContext(undefined)
const LEGACY_AUTH_STORAGE_KEYS = ['token', 'refreshToken', 'user']
// User-scoped local data that must be cleared on session change to prevent
// previous-user data leakage to the next authenticated user.
const USER_SCOPED_STORAGE_KEYS = ['kg-recent-notes', 'kg-recent-posts']

let sessionUserCache = null
let hasSessionUserCache = false
let sessionUserPromise = null

function clearLegacyAuthStorage() {
  LEGACY_AUTH_STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key)
  })
}

function clearUserScopedStorage() {
  USER_SCOPED_STORAGE_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore quota / disabled-storage errors
    }
  })
}

function normalizeUser(data) {
  if (!data || (!data.userId && !data.id)) return null

  return {
    id: data.userId ?? data.id ?? null,
    email: data.email ?? '',
    name: data.name ?? '',
    role: data.role ?? null,
  }
}

function clearSessionUserCache() {
  sessionUserCache = null
  hasSessionUserCache = false
  sessionUserPromise = null
}

async function loadSessionUser({ force = false } = {}) {
  if (force && sessionUserPromise) {
    await sessionUserPromise.catch(() => {})
  } else if (sessionUserPromise) {
    return sessionUserPromise
  }

  if (!force && hasSessionUserCache) {
    return sessionUserCache
  }

  sessionUserPromise = (async () => {
    try {
      const me = normalizeUser(await fetchMe())
      sessionUserCache = me
      hasSessionUserCache = true
      return me
    } finally {
      sessionUserPromise = null
    }
  })()

  return sessionUserPromise
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()

  const applyUser = useCallback((data) => {
    const nextUser = normalizeUser(data)

    if (!nextUser) {
      clearSessionUserCache()
      setUser(null)
      return null
    }

    clearLegacyAuthStorage()
    sessionUserCache = nextUser
    hasSessionUserCache = true
    setUser(nextUser)
    return nextUser
  }, [])

  const restoreSession = useCallback(async ({ force = false, fallbackUser = null } = {}) => {
    try {
      const me = await loadSessionUser({ force })
      return applyUser(me)
    } catch (error) {
      if (fallbackUser) {
        return applyUser(fallbackUser)
      }
      throw error
    }
  }, [applyUser])

  const clearAuthClientState = useCallback(() => {
    // Bump generation FIRST so any in-flight refresh result is logically rejected
    // before we nuke the cache.
    bumpAuthGeneration()
    void queryClient.cancelQueries()
    queryClient.clear()
    clearSessionUserCache()
    clearLegacyAuthStorage()
    clearUserScopedStorage()
    setUser(null)
  }, [queryClient])

  useEffect(() => {
    let active = true

    const bootstrap = async () => {
      console.log('[auth] starting bootstrap')
      try {
        const me = await loadSessionUser()
        console.log('[auth] session user loaded:', me?.id ? 'authenticated' : 'anonymous')
        if (!active) return
        applyUser(me)
      } catch (error) {
        console.error('[auth] bootstrap failed:', error)
        if (!active) return
        clearSessionUserCache()
        clearLegacyAuthStorage()
        setUser(null)
      } finally {
        if (active) {
          console.log('[auth] bootstrap finished')
          setLoading(false)
        }
      }
    }

    bootstrap()

    return () => {
      active = false
    }
  }, [applyUser])

  useEffect(() => {
    const handleSessionExpired = () => {
      clearAuthClientState()
      setLoading(false)
    }

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => {
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired)
    }
  }, [clearAuthClientState])

  const login = useCallback(async (email, password) => {
    clearSessionUserCache()
    const response = await apiLogin(email, password)
    await restoreSession({ force: true, fallbackUser: response })
    return response
  }, [restoreSession])

  const oauthLogin = useCallback(async () => {
    await restoreSession()
  }, [restoreSession])

  const signup = useCallback(async (email, password, name) => {
    const response = await apiSignup(email, password, name)
    return response
  }, [])

  const updateProfile = useCallback(async (name) => {
    const response = await apiUpdateMyProfile(name)
    applyUser(response)
    return response
  }, [applyUser])

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    return apiChangeMyPassword(currentPassword, newPassword)
  }, [])

  const logout = useCallback(() => {
    clearAuthClientState()
  }, [clearAuthClientState])

  const value = useMemo(
    () => ({
      user,
      login,
      oauthLogin,
      signup,
      updateProfile,
      changePassword,
      logout,
      isAuthenticated: !!user,
      loading,
    }),
    [user, login, oauthLogin, signup, updateProfile, changePassword, logout, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
