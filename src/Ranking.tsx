import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { LunchScore } from './Lunches'

export default function Ranking() {
  const [rows, setRows] = useState<{ host: string; avg: number; n: number }[]>([])

  useEffect(() => {
    supabase.from('lunch_scores').select('*').not('avg_score', 'is', null).then(({ data }) => {
      const by: Record<string, { sum: number; n: number }> = {}
      for (const l of (data ?? []) as LunchScore[]) {
        const b = (by[l.host_name] ??= { sum: 0, n: 0 })
        b.sum += Number(l.avg_score); b.n += 1
      }
      setRows(Object.entries(by)
        .map(([host, b]) => ({ host, avg: b.sum / b.n, n: b.n }))
        .sort((a, b) => b.avg - a.avg))
    })
  }, [])

  return (
    <section>
      <h2>Mejores anfitriones</h2>
      {rows.length === 0 && <p className="note">Todavía no hay valoraciones.</p>}
      <ol className="list">
        {rows.map((r) => (
          <li key={r.host} className="lunch static">
            <span><strong>{r.host}</strong><small>{r.n} almuerzo{r.n === 1 ? '' : 's'}</small></span>
            <span className="score">{r.avg.toFixed(2)}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
