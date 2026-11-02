import { NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Spinner } from './components/ui'
import { useAuth } from './lib/auth'
import Analyze from './pages/Analyze'
import AuthPage from './pages/AuthPage'
import Cook from './pages/Cook'
import Dashboard from './pages/Dashboard'
import Freshness from './pages/Freshness'
import History from './pages/History'
import Hygiene from './pages/Hygiene'
import MealPlan from './pages/MealPlan'

const NAV = [
  ['/', '📊', 'Dashboard'], ['/analyze', '🍽️', 'Analyze'], ['/freshness', '🥬', 'Freshness'], ['/hygiene', '🧼', 'Hygiene'],
  ['/cook', '👩‍🍳', 'Cook'], ['/plan', '🗓️', 'Plans'], ['/history', '🗂️', 'History'],
]

function Shell() {
  const { user, ready, logout } = useAuth()
  if (!ready) return <div className="center-screen"><Spinner label="Loading FoodVerse…" /></div>
  if (!user) return <Navigate to="/login" replace />
  return (
    <div className="shell">
      <div className="orb o1" /><div className="orb o2" />
      <nav className="side no-print">
        <div className="logo">🥗 FoodVerse</div>
        {NAV.map(([to, icon, label]) => <NavLink key={to} to={to} end={to === '/'}><span>{icon}</span><em>{label}</em></NavLink>)}
        <div className="side-foot"><small>{user.email}</small><button className="btn ghost" onClick={logout}>Sign out</button></div>
      </nav>
      <main><Outlet /></main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route element={<Shell />}>
        <Route index element={<Dashboard />} />
        <Route path="analyze" element={<Analyze />} />
        <Route path="freshness" element={<Freshness />} />
        <Route path="hygiene" element={<Hygiene />} />
        <Route path="cook" element={<Cook />} />
        <Route path="plan" element={<MealPlan />} />
        <Route path="history" element={<History />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
