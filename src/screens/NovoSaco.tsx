import { useState, type FormEvent } from 'react'
import { addBags } from '../data/freezerRepo'
import { parseAmount } from '../domain/freezer'
import type { DateKey } from '../domain/dates'
import type { FreezerBag } from '../domain/types'

const UNITS: { value: FreezerBag['unit']; label: string }[] = [
  { value: 'un', label: 'unid.' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'doses', label: 'doses' },
]

interface Props {
  category: FreezerBag['category']
  names: string[]
  today: DateKey
  onDone: () => void
}

export default function NovoSaco({ category: initialCategory, names, today, onDone }: Props) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState(initialCategory)
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState<FreezerBag['unit']>(initialCategory === 'feita' ? 'doses' : 'un')
  const [count, setCount] = useState(1)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const n = parseAmount(amount)
    if (!name.trim()) return setError('Falta o nome')
    if (n === null) return setError('Quantidade inválida')
    addBags({ name, category, amount: n, unit, count }, today)
    onDone()
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="card-title">Novo saco <button type="button" className="link-btn" onClick={onDone}>Cancelar</button></div>
      <div className="seg">
        <button type="button" className={category === 'carne' ? 'on' : ''} onClick={() => setCategory('carne')}>Carne / peixe</button>
        <button type="button" className={category === 'feita' ? 'on' : ''} onClick={() => setCategory('feita')}>Comida feita</button>
      </div>
      <label className="field">
        <span>O que é</span>
        <input className="input" list="nomes-congelador" placeholder="ex.: Bifes de frango" value={name}
          onChange={e => { setName(e.target.value); setError('') }} autoFocus />
        <datalist id="nomes-congelador">{names.map(n => <option key={n} value={n} />)}</datalist>
      </label>
      <div className="field">
        <span>Quantidade por saco</span>
        <div className="inline">
          <input className="input" inputMode="decimal" placeholder="ex.: 2 ou 2,5" value={amount}
            onChange={e => { setAmount(e.target.value); setError('') }} style={{ flex: 1 }} />
        </div>
        <div className="seg" style={{ marginTop: 6 }}>
          {UNITS.map(u => <button type="button" key={u.value} className={unit === u.value ? 'on' : ''} onClick={() => setUnit(u.value)}>{u.label}</button>)}
        </div>
      </div>
      <div className="field">
        <span>Nº de sacos</span>
        <div className="inline" style={{ alignItems: 'center' }}>
          <button type="button" className="icon-btn" onClick={() => setCount(Math.max(1, count - 1))}>−</button>
          <strong style={{ minWidth: 32, textAlign: 'center' }}>{count}</strong>
          <button type="button" className="icon-btn" onClick={() => setCount(Math.min(20, count + 1))}>+</button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn primary block">Guardar</button>
    </form>
  )
}
