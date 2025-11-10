import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import BlogListPage from './pages/BlogListPage'
import BlogDetailPage from './pages/BlogDetailPage'
import BlogWritePage from './pages/BlogWritePage'
import RAGQueryPage from './pages/RAGQueryPage'
import ResumePage from './pages/ResumePage'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/blogs" replace />} />
            <Route path="blogs" element={<BlogListPage />} />
            <Route path="blogs/:id" element={<BlogDetailPage />} />
            <Route path="blogs/write" element={<BlogWritePage />} />
            <Route path="blogs/edit/:id" element={<BlogWritePage />} />
            <Route path="query" element={<RAGQueryPage />} />
            <Route path="resume" element={<ResumePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App

