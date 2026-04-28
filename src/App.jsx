import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './api/queryClient'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { ConfirmProvider } from './components/ConfirmModal'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import PublicLayout from './components/PublicLayout'
import VaultLayout from './components/VaultLayout'
import PageLoader from './components/PageLoader'
import './App.css'

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({
        default: m.ReactQueryDevtools,
      })),
    )
  : null

const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const BlogListPage = lazy(() => import('./pages/BlogListPage'))
const BlogDetailPage = lazy(() => import('./pages/BlogDetailPage'))
const BlogWritePage = lazy(() => import('./pages/BlogWritePage'))
const RAGQueryPage = lazy(() => import('./pages/RAGQueryPage'))
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

function PublicHandleRoute() {
  const { username = '' } = useParams()

  if (!username.startsWith('@')) {
    return <Navigate to="/notes" replace />
  }

  return <Outlet />
}

function LegacyNotesRedirect() {
  const location = useLocation()
  const nextPathname = location.pathname.replace(/^\/blogs(\/|$)/, '/notes$1')
  return <Navigate to={`${nextPathname}${location.search}${location.hash}`} replace />
}

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <Routes>
                <Route path="/login" element={renderLazyPage(LoginPage)} />
                <Route path="/signup" element={renderLazyPage(SignupPage)} />
                <Route path="/oauth/callback" element={renderLazyPage(OAuthCallbackPage, '로그인을 처리하는 중...')} />

                <Route path="/:username" element={<PublicHandleRoute />}>
                  <Route element={<PublicLayout />}>
                    <Route index element={renderLazyPage(PublicProfilePage)} />
                    <Route path=":noteId" element={renderLazyPage(PublicPostPage)} />
                  </Route>
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
                  <Route path="settings/account" element={renderLazyPage(AccountSettingsPage)} />
                  <Route path="users/:username" element={renderLazyPage(PublicProfilePage)} />
                  <Route path="users/:username/:noteId" element={renderLazyPage(PublicPostPage)} />
                </Route>
              </Routes>
              {ReactQueryDevtools ? (
                <Suspense fallback={null}>
                  <ReactQueryDevtools initialIsOpen={false} />
                </Suspense>
              ) : null}
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  )
}

export default App
