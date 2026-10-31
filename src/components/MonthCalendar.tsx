import { useState } from 'react'
import { monthHistory } from '../domain/routines'
import { weekdayOf, type DateKey } from '../domain/dates'
import type { Routine, RoutineCheck } from '../domain/types'
import Icon from './Icon'

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const HEAD = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
const TITLE = { completo: 'completo', parcial: 'parcial', nao: 'não feito', sem: 'sem passos' } as const

/** Month grid (Monday first) coloured by how much of the routine was done each day. */
export default function MonthCalendar({ routine, checks, today }: { routine: Routine; checks: RoutineCheck[]; today: DateKey }) {
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }))
  const days = monthHistory(routine, checks, ym.y, ym.m)
  const lead = (weekdayOf(days[0].key) + 6) % 7
  const shift = (d: number) => setYm(({ y, m }) => {
    const t = y * 12 + (m - 1) + d
    return { y: Math.floor(t / 12), m: (t % 12) + 1 }
  })

  return (
    <div className="card">
      <div className="month-nav">
        <button onClick={() => shift(-1)} aria-label="Mês anterior"><Icon name="voltar" /></button>
        <span>{MONTHS[ym.m - 1]} {ym.y}</span>
        <button onClick={() => shift(1)} aria-label="Mês seguinte"><Icon name="seta" /></button>
      </div>
      <div className="cal">
        {HEAD.map((h, i) => <div key={i} className="cal-head">{h}</div>)}
        {Array.from({ length: lead }, (_, i) => <div key={`e${i}`} />)}
        {days.map(d => {
          const future = d.key > today || (routine.createdKey !== undefined && d.key < routine.createdKey)
          const cls = future ? 'sem' : d.status
          return (
            <div key={d.key} className={`d ${cls}${d.key === today ? ' today' : ''}`} title={future ? '' : TITLE[d.status]}>
              {Number(d.key.slice(8))}
            </div>
          )
        })}
      </div>
      <div className="legend small muted"><i className="completo" /> completo <i className="parcial" /> parcial <i className="nao" /> não feito</div>
    </div>
  )
}
