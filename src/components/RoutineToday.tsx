import { Link } from 'react-router-dom'
import { useCollection } from '../data/useCollection'
import { useSession } from '../data/session'
import { toggleStep } from '../data/routinesRepo'
import { stepsFor } from '../domain/routines'
import type { DateKey } from '../domain/dates'
import type { Routine, RoutineCheck, Step } from '../domain/types'

const PERIODS: { value: Step['period']; label: string }[] = [
  { value: 'manha', label: '☀️ Manhã' },
  { value: 'noite', label: '🌙 Noite' },
]

/** Today's routine steps for one person, grouped by morning/night. Only the owner can tick. */
export default function RoutineToday({ ownerUid, day }: { ownerUid: string; day: DateKey }) {
  const { uid } = useSession()
  const routines = [...useCollection<Routine>('routines', ['ownerUid', '==', ownerUid])].sort((a, b) => a.order - b.order)
  const checks = useCollection<RoutineCheck>('routineChecks', ['dateKey', '==', day])
  const mine = ownerUid === uid
  const done = (r: Routine) => checks.find(c => c.routineId === r.id)?.doneStepIds ?? []

  return (
    <>
      {PERIODS.map(p => {
        const rows = routines.flatMap(r => stepsFor(r, day, p.value).map(s => ({ r, s })))
        if (!rows.length) return null
        const count = rows.filter(({ r, s }) => done(r).includes(s.id)).length
        return (
          <div className="card" key={p.value}>
            <div className="card-title">{p.label} <span className="pill">{count}/{rows.length}</span></div>
            {rows.map(({ r, s }) => {
              const on = done(r).includes(s.id)
              return (
                <div className="row" key={r.id + s.id}>
                  <button className={on ? 'check on' : 'check'} disabled={!mine} aria-label={s.text}
                    onClick={() => toggleStep(r, day, s.id, !on)}>{on ? '✓' : ''}</button>
                  <div className="grow">
                    <div className={on ? 'done-text' : ''}>{s.text}</div>
                    {s.note && <div className="note">{s.note}</div>}
                    {s.checklistId && <Link className="note" to={`/mais/checklists/${s.checklistId}`}>abrir checklist →</Link>}
                  </div>
                  {routines.length > 1 && <span className="small muted">{r.name}</span>}
                </div>
              )
            })}
          </div>
        )
      })}
      {routines.filter(r => r.note).map(r => (
        <p className="small muted" key={r.id}>📌 {r.name}: {r.note}</p>
      ))}
    </>
  )
}
