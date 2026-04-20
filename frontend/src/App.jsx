import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import theme from './theme'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import RunDetailPage from './pages/RunDetailPage'
import RunsHistoryPage from './pages/RunsHistoryPage'
import UsersPage from './pages/UsersPage'

function ProtectedRoute({ children, minRole }) {
  const { auth, hasRole } = useAuth()

  if (!auth) return <Navigate to="/login" replace />
  if (auth.mustChangePassword) return <Navigate to="/change-password" replace />
  if (minRole && !hasRole(minRole)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route path="/" element={
              <ProtectedRoute><AppLayout /></ProtectedRoute>
            }>
              <Route index element={<DashboardPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:id" element={<ProjectDetailPage />} />
              <Route path="runs" element={<RunsHistoryPage />} />
              <Route path="runs/:id" element={<RunDetailPage />} />
              <Route path="users" element={
                <ProtectedRoute minRole="ADMIN"><UsersPage /></ProtectedRoute>
              } />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}