import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useCollection } from '../data/useCollection'
import { useSession } from '../data/session'
import { useToday } from '../hooks/useToday'
import { addExpense, deleteExpense } from '../data/expensesRepo'
import { formatEuros, monthTotals, parseEuros } from '../domain/expenses'
import type { Expense } from '../domain/types'

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function Gastos() {
  const { uid, members } = useSession()
  const today = useToday()
  const expenses = useCollection<Expense>('expenses')
  const [value, setValue] = useState('')
  const [who, setWho] = useState(uid)
  const [dateKey, setDateKey] = useState(today)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    const cents = parseEuros(value)
    if (cents === null) return setError('Valor inválido')
    addExpense(cents, who, dateKey || today, note)
    setValue('')
    setNote('')
    setError('')
  }

  const shift = (d: number) => setYm(({ y, m }) => {
    const t = y * 12 + (m - 1) + d
    return { y: Math.floor(t / 12), m: (t % 12) + 1 }
  })
  const totals = monthTotals(expenses, ym.y, ym.m)
  const prefix = `${ym.y}-${String(ym.m).padStart(2, '0')}`
  const list = expenses.filter(e => e.dateKey.startsWith(prefix)).sort((a, b) => b.dateKey.localeCompare(a.dateKey))

  return (
    <>
      <Link to="/mais" className="link-btn">‹ Mais</Link>
      <h1>Gastos do supermercado</h1>

      <form className="card" onSubmit={submit}>
        <div className="inline">
          <input className="input" inputMode="decimal" placeholder="Valor (ex.: 12,50)" value={value}
            onChange={e => { setValue(e.target.value); setError('') }} />
          <button className="btn primary">Registar</button>
        </div>
        <div className="seg" style={{ marginTop: 8 }}>
          {Object.entries(members).map(([id, name]) => (
            <button type="button" key={id} className={who === id ? 'on' : ''} onClick={() => setWho(id)}>{name}</button>
          ))}
        </div>
        <div className="inline">
          <input className="input" type="date" value={dateKey} onChange={e => setDateKey(e.target.value)} style={{ flex: 1 }} />
          <input className="input" placeholder="Nota (opcional)" value={note} onChange={e => setNote(e.target.value)} style={{ flex: 1 }} />
        </div>
        {error && <p className="error">{error}</p>}
      </form>

      <div className="card">
        <div className="card-title">
          <button className="link-btn" onClick={() => shift(-1)} aria-label="Mês anterior">‹</button>
          <span>{MONTHS[ym.m - 1]} {ym.y}</span>
          <button className="link-btn" onClick={() => shift(1)} aria-label="Mês seguinte">›</button>
        </div>
        {Object.entries(members).map(([id, name]) => (
          <div className="row" key={id}><span className="grow">{name}</span><strong>{formatEuros(totals.byUid[id] ?? 0)}</strong></div>
        ))}
        <div className="row"><span className="grow"><strong>Total</strong></span><strong>{formatEuros(totals.total)}</strong></div>
      </div>

      {list.length > 0 && (
        <div className="card">
          {list.map(e => (
            <div className="row small" key={e.id}>
              <span className="grow">{e.dateKey.slice(8)}/{e.dateKey.slice(5, 7)} · {members[e.uid] ?? '?'}{e.note ? ` · ${e.note}` : ''}</span>
              <span>{formatEuros(e.cents)}</span>
              <button className="link-btn" aria-label="Apagar registo" onClick={() => confirm('Apagar este registo?') && deleteExpense(e.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
