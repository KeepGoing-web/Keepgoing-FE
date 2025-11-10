import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Layout.css'

const Layout = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <Link to="/blogs" className="logo">
            Keepgoing
          </Link>
          <nav className="nav">
            <Link to="/blogs">블로그</Link>
            <Link to="/query">질의하기</Link>
            <Link to="/resume">이력서/자기소개서</Link>
          </nav>
          <div className="user-menu">
            <span className="user-name">{user?.name}</span>
            <button onClick={handleLogout} className="logout-btn">
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout

