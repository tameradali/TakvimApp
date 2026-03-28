import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { useAuth } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Takvim } from './pages/Takvim'
import { Gelir } from './pages/Gelir'
import { BeklenenEgitimler } from './pages/BeklenenEgitimler'
import { Ayarlar } from './pages/Ayarlar'
import { AdminPanel } from './pages/AdminPanel'
import { ReactNode } from 'react'
import './index.css'

function AdminRoute({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/app" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Takvim />} />
            <Route path="gelir" element={<Gelir />} />
            <Route path="beklenen" element={<BeklenenEgitimler />} />
            <Route path="ayarlar" element={<Ayarlar />} />
            <Route path="admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
