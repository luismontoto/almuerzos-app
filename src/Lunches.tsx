import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

export type LunchScore = {
  id: string; title: string | null; held_on: string; host_id: string
  host_name: string; avg_score: number | null; voters: number
}
type Criterion = { id: number; name: string; question: string | null; description: string | null }

const LEVELS = ['Flojo', 'Mejorable', 'Bien', 'Muy bien', 'Excelente']

export default function Lunches({ userId }: { userId: string }) {
  const [lunches, setLunches] = useState<LunchScore[]>([])
  const [criteria, setCriteria] = useState<Criterion[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const firstLoad = useRef(true)

  async function load() {
    const [l, c] = await Promise.all([
      supabase.from('lunch_scores').select('*').order('held_on', { ascending: false }),
      supabase.from('criteria').select('*').order('position'),
    ])
    const list = (l.data ?? []) as LunchScore[]
    setLunches(list)
    setCriteria((c.data ?? []) as Criterion[])
    if (firstLoad.current) {
      firstLoad.current = false
      const next = list.find((x) => x.host_id !== userId)
      if (next) setOpen(next.id)
    }
  }
  useEffect(() => { load() }, [])

  return (
    <section>
      <div className="row">
        <h2>Mesas</h2>
        <button className="primary" onClick={() => setAdding(!adding)}>{adding ? 'Cancelar' : 'Anotar mi almuerzo'}</button>
      </div>
      {adding && <NewLunch userId={userId} onSaved={() => { setAdding(false); load() }} />}
      {lunches.length === 0 && (
        <>
          <p className="note">Aún no hay almuerzos. Anota el primero cuando te toque cocinar. Así valorarás los de tus amigos:</p>
          <div className="card">
            {criteria.map((c) => <div key={c.id}><strong>{c.question ?? c.name}</strong><small className="sub">{c.description}</small></div>)}
            <p className="note">Respondes del 1 (flojo) al 5 (excelente).</p>
          </div>
        </>
      )}
      <ul className="list">
        {lunches.map((l) => (
          <li key={l.id}>
            <button className="lunch" onClick={() => setOpen(open === l.id ? null : l.id)}>
              <span>
                <strong>{l.title || 'Almuerzo en casa de ' + l.host_name}</strong>
                <small>{l.host_name} · {new Date(l.held_on).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</small>
              </span>
              <span className="score">{l.avg_score ?? '–'}<small>{l.voters} voto{l.voters === 1 ? '' : 's'}</small></span>
            </button>
            {open === l.id && (
              l.host_id === userId
                ? <p className="note">Es tu almuerzo: esta vez te toca esperar el veredicto.</p>
                : <Rate lunchId={l.id} userId={userId} criteria={criteria} onSaved={load} />
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function NewLunch({ userId, onSaved }: { userId: string; onSaved: () => void }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [menu, setMenu] = useState('')
  const [err, setErr] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('lunches')
      .insert({ host_id: userId, held_on: date, title: title || null, menu: menu || null })
    if (error) setErr(error.message); else onSaved()
  }

  return (
    <form onSubmit={save} className="card">
      <label>Fecha<input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <label>Título<input value={title} placeholder="Paella de domingo" onChange={(e) => setTitle(e.target.value)} /></label>
      <label>Menú<textarea value={menu} onChange={(e) => setMenu(e.target.value)} /></label>
      <button className="primary">Guardar almuerzo</button>
      {err && <p className="err">{err}</p>}
    </form>
  )
}

function Rate({ lunchId, userId, criteria, onSaved }: {
  lunchId: string; userId: string; criteria: Criterion[]; onSaved: () => void
}) {
  const [scores, setScores] = useState<Record<number, number>>({})
  const [status, setStatus] = useState('')

  useEffect(() => {
    supabase.from('ratings').select('criterion_id, score').eq('lunch_id', lunchId).eq('user_id', userId)
      .then(({ data }) => setScores(Object.fromEntries((data ?? []).map((r) => [r.criterion_id, r.score]))))
  }, [lunchId, userId])

  const done = criteria.filter((c) => scores[c.id]).length

  async function save() {
    const rows = criteria.map((c) => ({
      lunch_id: lunchId, user_id: userId, criterion_id: c.id, score: scores[c.id],
    }))
    const { error } = await supabase.from('ratings').upsert(rows)
    setStatus(error ? error.message : 'Valoración guardada')
    if (!error) onSaved()
  }

  return (
    <div className="card">
      <p className="note">Del 1 (flojo) al 5 (excelente). {done} de {criteria.length} respondidas.</p>
      {criteria.map((c) => (
        <div key={c.id} className="crit">
          <div>
            <strong>{c.question ?? c.name}</strong>
            <small>{c.description}</small>
            {scores[c.id] && <small className="level">{LEVELS[scores[c.id] - 1]}</small>}
          </div>
          <div className="stars" role="radiogroup" aria-label={c.question ?? c.name}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} role="radio" aria-checked={scores[c.id] === n} title={LEVELS[n - 1]}
                className={scores[c.id] === n ? 'on' : ''} onClick={() => setScores({ ...scores, [c.id]: n })}>{n}</button>
            ))}
          </div>
        </div>
      ))}
      <button className="primary" disabled={criteria.length === 0 || done < criteria.length} onClick={save}>Guardar valoración</button>
      {status && <p className="note">{status}</p>}
    </div>
  )
}
