import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { AUTH_SESSION_EXPIRED_EVENT, login as apiLogin, signup as apiSignup, fetchMe } from '../api/client'

const AuthContext = createContext(undefined)
const LEGACY_AUTH_STORAGE_KEYS = ['token', 'refreshToken', 'user']

let sessionUserCache = null
let hasSessionUserCache = false
let sessionUserPromise = null

function clearLegacyAuthStorage() {
  LEGACY_AUTH_STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key)
  })
}

function normalizeUser(data) {
  if (!data) return null

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
  if (!force && hasSessionUserCache) {
    return sessionUserCache
  }

  if (sessionUserPromise) {
    return sessionUserPromise
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

  useEffect(() => {
    let active = true

    const bootstrap = async () => {
      try {
        const me = await loadSessionUser()
        if (!active) return
        applyUser(me)
      } catch {
        if (!active) return
        clearSessionUserCache()
        clearLegacyAuthStorage()
        setUser(null)
      } finally {
        if (active) {
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
      clearSessionUserCache()
      clearLegacyAuthStorage()
      setUser(null)
      setLoading(false)
    }

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => {
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired)
    }
  }, [])

  const login = async (email, password) => {
    clearSessionUserCache()
    const response = await apiLogin(email, password)
    await restoreSession({ force: true, fallbackUser: response })
    return response
  }

  const oauthLogin = useCallback(async () => {
    await restoreSession()
  }, [restoreSession])

  const signup = async (email, password, name) => {
    const response = await apiSignup(email, password, name)
    return response
  }

  const logout = useCallback(() => {
    clearSessionUserCache()
    clearLegacyAuthStorage()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        oauthLogin,
        signup,
        logout,
        isAuthenticated: !!user,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
