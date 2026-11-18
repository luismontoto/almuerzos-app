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
        <button className="ghost" onClick={() => supabase.auth.signOut()}>Salir ({name})</button>
      </header>
      {tab === 'lunches' ? <Lunches userId={session.user.id} /> : <Ranking />}
    </main>
  )
}

function Login() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sent' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) { setMsg(error.message); setState('error') } else setState('sent')
  }

  return (
    <main className="narrow">
      <h1>Almuerzos</h1>
      <p className="lead">Entra con tu email y valora la última mesa a la que te invitaron.</p>
      {state === 'sent' ? (
        <p className="note">Te hemos enviado un enlace a {email}. Ábrelo en este dispositivo para entrar.</p>
      ) : (
        <form onSubmit={send}>
          <label>Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="primary">Enviar enlace de acceso</button>
          {state === 'error' && <p className="err">{msg}</p>}
        </form>
      )}
    </main>
  )
}

function Welcome({ userId, onDone }: { userId: string; onDone: (n: string) => void }) {
  const [value, setValue] = useState('')
  async function save(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('profiles').insert({ id: userId, display_name: value.trim() })
    if (!error) onDone(value.trim())
  }
  return (
    <main className="narrow">
      <h1>¿Cómo te llaman?</h1>
      <p className="lead">Es el nombre que verán tus amigos en los almuerzos y valoraciones.</p>
      <form onSubmit={save}>
        <label>Nombre
          <input required value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <button className="primary">Guardar nombre</button>
      </form>
    </main>
  )
}
