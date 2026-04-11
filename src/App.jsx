import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { ConfirmProvider } from './components/ConfirmModal'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import PublicLayout from './components/PublicLayout'
import VaultLayout from './components/VaultLayout'
import PageLoader from './components/PageLoader'
import './App.css'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const BlogListPage = lazy(() => import('./pages/BlogListPage'))
const BlogDetailPage = lazy(() => import('./pages/BlogDetailPage'))
const BlogWritePage = lazy(() => import('./pages/BlogWritePage'))
const RAGQueryPage = lazy(() => import('./pages/RAGQueryPage'))
const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage'))
const ExplorePage = lazy(() => import('./pages/ExplorePage'))
const AccountSettingsPage = lazy(() => import('./pages/AccountSettingsPage'))
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage'))
const PublicPostPage = lazy(() => import('./pages/PublicPostPage'))
const OAuthCallbackPage = lazy(() => import('./pages/OAuthCallbackPage'))

function renderLazyPage(Component, label = '페이지를 불러오는 중...') {
  return (
    <Suspense fallback={<PageLoader label={label} />}>
      <Component />
    </Suspense>
  )
}

function LegacyNotesRedirect() {
  const location = useLocation()
  const nextPathname = location.pathname.replace(/^\/blogs(\/|$)/, '/notes$1')
  return <Navigate to={`${nextPathname}${location.search}${location.hash}`} replace />
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={renderLazyPage(LoginPage)} />
              <Route path="/signup" element={renderLazyPage(SignupPage)} />
              <Route path="/oauth/callback" element={renderLazyPage(OAuthCallbackPage, '로그인을 처리하는 중...')} />

              <Route path="/@:username" element={<PublicLayout />}>
                <Route index element={renderLazyPage(PublicProfilePage)} />
                <Route path=":noteId" element={renderLazyPage(PublicPostPage)} />
              </Route>

              <Route
                path="/"
                element={(
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                )}
              >
                <Route index element={<Navigate to="/notes" replace />} />
                <Route path="blogs/*" element={<LegacyNotesRedirect />} />

                <Route path="notes" element={<VaultLayout />}>
                  <Route index element={renderLazyPage(DashboardPage)} />
                  <Route path="list" element={renderLazyPage(BlogListPage)} />
                  <Route path=":id" element={renderLazyPage(BlogDetailPage)} />
                  <Route path="write" element={renderLazyPage(BlogWritePage, '에디터를 준비하는 중...')} />
                  <Route path="edit/:id" element={renderLazyPage(BlogWritePage, '에디터를 준비하는 중...')} />
                </Route>

                <Route path="query" element={renderLazyPage(RAGQueryPage)} />
                <Route path="applications" element={renderLazyPage(ApplicationsPage)} />
                <Route path="explore" element={renderLazyPage(ExplorePage)} />
                <Route path="settings/account" element={renderLazyPage(AccountSettingsPage)} />
                <Route path="users/:username" element={renderLazyPage(PublicProfilePage)} />
                <Route path="users/:username/:noteId" element={renderLazyPage(PublicPostPage)} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
