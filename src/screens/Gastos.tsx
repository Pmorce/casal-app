import { useCallback, useState, type FormEvent } from 'react'
import { useCollection } from '../data/useCollection'
import { useSession } from '../data/session'
import { useToday } from '../hooks/useToday'
import { addExpense, deleteExpense } from '../data/expensesRepo'
import { formatEuros, monthTotals, parseEuros } from '../domain/expenses'
import type { Expense } from '../domain/types'
import UndoToast from '../components/UndoToast'
import { restore } from '../data/restore'
import PageHeader from '../components/PageHeader'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function Gastos() {
  const { uid, members } = useSession()
  const today = useToday()
  const expenses = useCollection<Expense>('expenses')
  const [value, setValue] = useState('')
  const [who, setWho] = useState(uid)
  // null = today: left open past midnight, the form and the month follow the new day unless changed by hand
  const [pickedDate, setPickedDate] = useState<string | null>(null)
  const dateKey = pickedDate ?? today
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [undo, setUndo] = useState<Expense | null>(null)
  const closeUndo = useCallback(() => setUndo(null), [])
  const [pickedMonth, setYm] = useState<{ y: number; m: number } | null>(null)
  const ym = pickedMonth ?? { y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const cents = parseEuros(value)
    if (cents === null) return setError('Valor inválido')
    addExpense(cents, who, dateKey, note)
    setPickedDate(null)
    setValue('')
    setNote('')
    setError('')
  }

  const shift = (d: number) => {
    const t = ym.y * 12 + (ym.m - 1) + d
    setYm({ y: Math.floor(t / 12), m: (t % 12) + 1 })
  }
  const totals = monthTotals(expenses, ym.y, ym.m)
  const prefix = `${ym.y}-${String(ym.m).padStart(2, '0')}`
  const list = expenses.filter(e => e.dateKey.startsWith(prefix)).sort((a, b) => b.dateKey.localeCompare(a.dateKey))

  return (
    <>
      <PageHeader title="Gastos do supermercado" back={{ to: '/mais', label: 'Voltar a Mais' }} />
      <div className="lift">
        <form className="card" onSubmit={submit}>
          <div className="seg">
            {Object.entries(members).map(([id, name]) => (
              <button type="button" key={id} className={who === id ? 'on' : ''} onClick={() => setWho(id)}>{name}</button>
            ))}
          </div>
          <input className="input" inputMode="decimal" placeholder="Valor (ex.: 12,50)" value={value}
            onChange={e => { setValue(e.target.value); setError('') }} />
          {/* side by side when they fit, one under the other on a small phone */}
          <div className="inline" style={{ flexWrap: 'wrap', margin: '8px 0 12px' }}>
            <input className="input" type="date" value={dateKey} onChange={e => setPickedDate(e.target.value || null)} style={{ flex: '1 1 140px', width: 'auto' }} />
            <input className="input" placeholder="Nota (opcional)" value={note} onChange={e => setNote(e.target.value)} style={{ flex: '1 1 140px', width: 'auto' }} />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn primary block">Registar</button>
        </form>

        <div className="card">
          <div className="month-nav">
            <button onClick={() => shift(-1)} aria-label="Mês anterior"><Icon name="voltar" /></button>
            <span>{MONTHS[ym.m - 1]} {ym.y}</span>
            <button onClick={() => shift(1)} aria-label="Mês seguinte"><Icon name="seta" /></button>
          </div>
          {Object.entries(members).map(([id, name]) => (
            <div className="row" key={id}><Avatar uid={id} size="sm" /><span className="grow">{name}</span><strong>{formatEuros(totals.byUid[id] ?? 0)}</strong></div>
          ))}
          <div className="row total"><span className="grow">Total</span><span className="total-n">{formatEuros(totals.total)}</span></div>
        </div>

        {list.length > 0 && (
          <div className="card">
            {list.map(e => (
              <div className="row small" key={e.id}>
                <span className="grow">{e.dateKey.slice(8)}/{e.dateKey.slice(5, 7)} · {members[e.uid] ?? '?'}{e.note ? ` · ${e.note}` : ''}</span>
                <span>{formatEuros(e.cents)}</span>
                <button className="x-btn" aria-label="Apagar registo" onClick={() => { deleteExpense(e.id); setUndo(e) }}><Icon name="x" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
      {undo && <UndoToast message={`Registo de ${formatEuros(undo.cents)} apagado`} onUndo={() => restore('expenses', [undo])} onClose={closeUndo} />}
    </>
  )
}
