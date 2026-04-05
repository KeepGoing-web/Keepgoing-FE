import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import PageLoader from './PageLoader'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <PageLoader label="인증 상태를 확인하는 중..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
