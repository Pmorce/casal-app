import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useCollection } from '../data/useCollection'
import { useSession } from '../data/session'
import { toggleStep } from '../data/routinesRepo'
import { routineProgress } from '../domain/routines'
import type { DateKey } from '../domain/dates'
import type { Routine, RoutineCheck, Step } from '../domain/types'
import Icon, { Badge, type IconName } from './Icon'

const PERIODS: { value: Step['period']; label: string; icon: IconName }[] = [
  { value: 'manha', label: 'Rotina da manhã', icon: 'sol' },
  { value: 'noite', label: 'Rotina da noite', icon: 'lua' },
]

/** Today's routine steps for one person, a card per morning/night. Only the owner can tick. */
export default function RoutineToday({ ownerUid, day }: { ownerUid: string; day: DateKey }) {
  const { uid } = useSession()
  const routines = [...useCollection<Routine>('routines', ['ownerUid', '==', ownerUid])].sort((a, b) => a.order - b.order)
  const checks = useCollection<RoutineCheck>('routineChecks', ['dateKey', '==', day])
  const mine = ownerUid === uid

  return (
    <>
      {PERIODS.map(p => {
        const { rows, done, total } = routineProgress(routines, checks, day, p.value)
        if (!total) return null
        const pct = Math.round((done / total) * 100)
        return (
          <section className="card" key={p.value}>
            <div className="card-head">
              <Badge icon={p.icon} tone="pessego" />
              <div className="grow">
                <h2>{p.label}</h2>
                <div className="meta">{done} de {total} feitos</div>
              </div>
              <span className="ring" style={{ '--p': pct } as CSSProperties} aria-hidden="true">{pct === 100 ? <Icon name="check" size={16} /> : <span>{pct}%</span>}</span>
            </div>
            {rows.map(({ r, s, on }) => (
              <div className={on ? 'row done' : 'row'} key={r.id + s.id}>
                <button className={on ? 'check on' : 'check'} disabled={!mine} aria-label={s.text}
                  onClick={() => toggleStep(r, day, s.id, !on)}>{on && <Icon name="check" />}</button>
                <div className="grow">
                  <div className={on ? 'done-text' : ''}>{s.text}</div>
                  {s.note && <div className="note">{s.note}</div>}
                  {s.checklistId && <Link className="note" to={`/mais/checklists/${s.checklistId}`}>abrir checklist →</Link>}
                </div>
                {routines.length > 1 && <span className="small muted">{r.name}</span>}
              </div>
            ))}
          </section>
        )
      })}
      {routines.filter(r => r.note).map(r => (
        <p className="small muted icon-line" key={r.id}><Icon name="lista" size={16} /><span>{r.name}: {r.note}</span></p>
      ))}
    </>
  )
}
