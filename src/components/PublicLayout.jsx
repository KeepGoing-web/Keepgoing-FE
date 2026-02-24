import { Link } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './PublicLayout.css'

const PublicLayout = () => {
  const { isAuthenticated, user } = useAuth()

  return (
    <div className="public-layout">
      <header className="public-header">
        <div className="public-header-content">
          <Link to={isAuthenticated ? '/blogs' : '/'} className="public-logo">
            keepgoing
          </Link>
          <div className="public-header-actions">
            {isAuthenticated ? (
              <div className="public-user-menu">
                <div className="public-user-initial">
                  {user?.name ? user.name.charAt(0) : user?.email?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <Link to="/blogs" className="public-dashboard-link">
                  내 대시보드
                </Link>
              </div>
            ) : (
              <Link to="/login" className="public-login-btn">
                로그인
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="public-main">
        <Outlet />
      </main>
    </div>
  )
}

export default PublicLayout
