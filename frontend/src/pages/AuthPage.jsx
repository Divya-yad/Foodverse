import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Alert } from '../components/ui'
import { useAuth } from '../lib/auth'

export default function AuthPage({ mode = 'login' }) {
  const { user, login, register } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const isLogin = mode === 'login'
  if (user) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    try {
      await (isLogin ? login(f.email, f.password) : register(f.name, f.email, f.password))
      nav('/')
    } catch (x) { setErr(x.details?.[0] ? `${x.details[0].field}: ${x.details[0].message}` : x.message) }
    setBusy(false)
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  return (
    <div className="auth-wrap">
      <div className="orb o1" /><div className="orb o2" /><div className="orb o3" />
      <form className="card auth-card fade-up" onSubmit={submit}>
        <div className="logo big">🥗 FoodVerse</div>
        <p className="muted">Multimodal food intelligence: photos, video, voice and text.</p>
        <h2>{isLogin ? 'Welcome back' : 'Create your account'}</h2>
        {!isLogin && <label>Full name<input required value={f.name} onChange={set('name')} autoComplete="name" /></label>}
        <label>Email<input required type="email" value={f.email} onChange={set('email')} autoComplete="email" /></label>
        <label>Password<input required type="password" minLength={isLogin ? 1 : 8} maxLength={72} value={f.password} onChange={set('password')} autoComplete={isLogin ? 'current-password' : 'new-password'} /></label>
        <Alert level="danger">{err}</Alert>
        <button className="btn block-btn" disabled={busy}>{busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}</button>
        <p className="muted center">{isLogin ? <>New here? <Link to="/register">Create an account</Link></> : <>Have an account? <Link to="/login">Sign in</Link></>}</p>
      </form>
    </div>
  )
}
