import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import Lunches from './Lunches'
import Ranking from './Ranking'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [name, setName] = useState<string | null | undefined>(undefined)
  const [tab, setTab] = useState<'lunches' | 'ranking'>('lunches')
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setName(undefined); return }
    supabase.from('profiles').select('display_name').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => setName(data?.display_name ?? null))
  }, [session])

  if (!ready) return null
  if (!session) return <Login />
  if (name === undefined) return null
  if (name === null) return <Welcome userId={session.user.id} onDone={setName} />

  return (
    <main>
      <header className="top">
        <h1>Almuerzos</h1>
        <nav>
          <button className={tab === 'lunches' ? 'on' : ''} onClick={() => setTab('lunches')}>Almuerzos</button>
          <button className={tab === 'ranking' ? 'on' : ''} onClick={() => setTab('ranking')}>Anfitriones</button>
        </nav>
        <button className="ghost" onClick={() => setShowPw(!showPw)}>Contraseña</button>
        <button className="ghost" onClick={() => supabase.auth.signOut()}>Salir ({name})</button>
      </header>
      {showPw && <ChangePassword onDone={() => setShowPw(false)} />}
      {tab === 'lunches' ? <Lunches userId={session.user.id} /> : <Ranking />}
    </main>
  )
}

function Login() {
  const [mode, setMode] = useState<'password' | 'link'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [msg, setMsg] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    if (mode === 'password') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMsg(error.message.includes('Invalid login') ? 'Email o contraseña incorrectos.' : error.message)
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin, shouldCreateUser: false },
      })
      if (error) setMsg(error.message); else setSent(true)
    }
  }

  return (
    <main className="narrow">
      <h1>Almuerzos</h1>
      <p className="lead">Solo para invitados. Entra con tu email y valora la última mesa a la que te invitaron.</p>
      {sent ? (
        <p className="note">Te hemos enviado un enlace a {email}. Ábrelo en este dispositivo para entrar.</p>
      ) : (
        <form onSubmit={submit}>
          <label>Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {mode === 'password' && (
            <label>Contraseña
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
          )}
          <button className="primary">{mode === 'password' ? 'Entrar' : 'Enviar enlace de acceso'}</button>
          <button type="button" className="ghost" onClick={() => { setMode(mode === 'password' ? 'link' : 'password'); setMsg('') }}>
            {mode === 'password' ? 'Prefiero entrar con un enlace por email' : 'Entrar con contraseña'}
          </button>
          {msg && <p className="err">{msg}</p>}
        </form>
      )}
    </main>
  )
}

function Welcome({ userId, onDone }: { userId: string; onDone: (n: string) => void }) {
  const [value, setValue] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    const { error: pe } = await supabase.auth.updateUser({ password })
    if (pe && !pe.message.includes('different')) return setErr(pe.message)
    const { error } = await supabase.from('profiles').insert({ id: userId, display_name: value.trim() })
    if (error) setErr(error.message)
    else onDone(value.trim())
  }

  return (
    <main className="narrow">
      <h1>Bienvenido a la mesa</h1>
      <p className="lead">Elige el nombre que verán tus amigos y una contraseña para volver a entrar.</p>
      <form onSubmit={save}>
        <label>Nombre
          <input required value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <label>Contraseña (mínimo 6 caracteres)
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="primary">Guardar y entrar</button>
        {err && <p className="err">{err}</p>}
      </form>
    </main>
  )
}

function ChangePassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setMsg(error.message)
    else { setMsg('Contraseña guardada'); setTimeout(onDone, 1200) }
  }

  return (
    <form onSubmit={save} className="card">
      <label>Nueva contraseña (mínimo 6 caracteres)
        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <button className="primary">Guardar contraseña</button>
      {msg && <p className="note">{msg}</p>}
    </form>
  )
}
