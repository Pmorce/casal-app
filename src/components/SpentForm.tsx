import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSession } from '../data/session'
import { addExpense } from '../data/expensesRepo'
import { parseEuros } from '../domain/expenses'
import { Badge } from './Icon'
import type { DateKey } from '../domain/dates'

/** "Quanto foi?" straight into Gastos; scrolls itself into view so it is never off-screen. */
export default function SpentForm({ title, today, onDone }: { title: string; today: DateKey; onDone: () => void }) {
  const { uid, members } = useSession()
  const [spent, setSpent] = useState('')
  const [who, setWho] = useState(uid)
  const [error, setError] = useState('')
  const form = useRef<HTMLFormElement>(null)
  // braces matter: recent Chromium returns a Promise here, and React would call it as the cleanup (black screen)
  useEffect(() => { form.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }) }, [])

  function submit(e: FormEvent) {
    e.preventDefault()
    const cents = parseEuros(spent)
    if (cents === null) return setError('Valor inválido')
    addExpense(cents, who, today)
    onDone()
  }

  return (
    <form className="card" onSubmit={submit} ref={form}>
      <div className="card-head">
        <Badge icon="euro" tone="rosa" />
        <h2 className="grow">{title}</h2>
      </div>
      <div className="inline">
        <input className="input" inputMode="decimal" placeholder="Valor (ex.: 47,30)" value={spent} autoFocus
          onChange={e => { setSpent(e.target.value); setError('') }} />
        <button className="btn primary">Registar</button>
      </div>
      <div className="seg" style={{ marginTop: 8 }}>
        {Object.entries(members).map(([id, name]) => (
          <button type="button" key={id} className={who === id ? 'on' : ''} onClick={() => setWho(id)}>{name}</button>
        ))}
      </div>
      {error && <p className="small error">{error}</p>}
      <button type="button" className="btn ghost block" onClick={onDone}>Agora não</button>
    </form>
  )
}
