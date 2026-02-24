import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { ConfirmProvider } from './components/ConfirmModal'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import PublicLayout from './components/PublicLayout'
import VaultLayout from './components/VaultLayout'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import BlogListPage from './pages/BlogListPage'
import BlogDetailPage from './pages/BlogDetailPage'
import BlogWritePage from './pages/BlogWritePage'
import RAGQueryPage from './pages/RAGQueryPage'
import ResumePage from './pages/ResumePage'
import ApplicationsPage from './pages/ApplicationsPage'
import ExplorePage from './pages/ExplorePage'
import PublicProfilePage from './pages/PublicProfilePage'
import PublicPostPage from './pages/PublicPostPage'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Public routes — no auth required */}
          <Route path="/@:username" element={<PublicLayout />}>
            <Route index element={<PublicProfilePage />} />
            <Route path=":postId" element={<PublicPostPage />} />
          </Route>

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/blogs" replace />} />

            {/* Vault: persistent sidebar for all blog routes */}
            <Route path="blogs" element={<VaultLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="list" element={<BlogListPage />} />
              <Route path=":id" element={<BlogDetailPage />} />
              <Route path="write" element={<BlogWritePage />} />
              <Route path="edit/:id" element={<BlogWritePage />} />
            </Route>

            <Route path="query" element={<RAGQueryPage />} />
            <Route path="resume" element={<ResumePage />} />
            <Route path="applications" element={<ApplicationsPage />} />
            <Route path="explore" element={<ExplorePage />} />
            <Route path="users/:username" element={<PublicProfilePage />} />
            <Route path="users/:username/:postId" element={<PublicPostPage />} />
          </Route>
            </Routes>
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
