import React, { createContext, useContext, useState, useEffect } from 'react'
import { login as apiLogin, signup as apiSignup } from '../api/client'

const AuthContext = createContext(undefined)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 저장된 토큰과 사용자 정보 복원
    const token = localStorage.getItem('token')
    if (token) {
      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        setUser(JSON.parse(savedUser))
      }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const response = await apiLogin(email, password)
    // 백엔드 응답: { accessToken, refreshToken, userId }
    const userData = {
      id: response.userId,
      email,
    }
    localStorage.setItem('token', response.accessToken)
    localStorage.setItem('refreshToken', response.refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    return response
  }

  const signup = async (email, password, name) => {
    const response = await apiSignup(email, password, name)
    // 회원가입 성공 후 자동 로그인하지 않음 (로그인 페이지로 이동)
    return response
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
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

