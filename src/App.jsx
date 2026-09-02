import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { MonthProvider } from './context/MonthContext'
import { WeekProvider } from './context/WeekContext'
import { isSupabaseConfigured } from './lib/supabase'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import FinancasPage from './pages/FinancasPage'
import InvestimentosPage from './pages/InvestimentosPage'
import AgendaPage from './pages/AgendaPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="grid h-screen place-items-center text-slate-400">Carregando…</div>
    )
  }
  return user ? children : <Navigate to="/login" replace />
}

function ConfigWarning() {
  return (
    <div className="grid h-screen place-items-center p-6">
      <div className="max-w-lg rounded-2xl border border-amber/40 bg-amber/10 p-6 text-amber-900 dark:text-amber">
        <h1 className="mb-2 font-display text-lg font-bold">Supabase não configurado</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Defina <code className="font-mono">VITE_SUPABASE_URL</code> e{' '}
          <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> no arquivo{' '}
          <code className="font-mono">.env</code> (local) ou nas variáveis de ambiente da
          Vercel, e recarregue a página.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  if (!isSupabaseConfigured) return <ConfigWarning />

  return (
    <AuthProvider>
      <MonthProvider>
        <WeekProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout dark={dark} onToggleTheme={() => setDark((d) => !d)} />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<HomePage />} />
              <Route path="/financeiro" element={<DashboardPage />} />
              <Route path="/financeiro/financas" element={<FinancasPage />} />
              <Route path="/financeiro/investimentos" element={<InvestimentosPage />} />
              <Route path="/agenda" element={<AgendaPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Analytics />
        </WeekProvider>
      </MonthProvider>
    </AuthProvider>
  )
}
