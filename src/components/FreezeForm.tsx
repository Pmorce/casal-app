import { useEffect, useRef, useState, type FormEvent } from 'react'
import { freezeBought } from '../data/freezerRepo'
import { freezeDefaults, parseAmount } from '../domain/freezer'
import type { DateKey } from '../domain/dates'
import type { FreezerUnit, Product } from '../domain/types'

const UNITS: { value: FreezerUnit; label: string }[] = [
  { value: 'un', label: 'un.' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'doses', label: 'doses' },
]

interface Row { product: Product; amount: string; unit: FreezerUnit; invalid: boolean }

interface Props {
  products: Product[]
  today: DateKey
  /** ids of the bags just created, so the screen can undo them */
  onSaved: (bagIds: string[]) => void
  onDone: () => void
}

/**
 * "Para o congelador": what was bought for the freezer goes in as one bag per product, as it came from the shop
 * (dividing happens later, at home). Scrolls itself into view so it is never off-screen.
 */
export default function FreezeForm({ products, today, onSaved, onDone }: Props) {
  const [rows, setRows] = useState<Row[]>(() => products.map(p => ({ product: p, ...freezeDefaults(p), invalid: false })))
  const form = useRef<HTMLFormElement>(null)
  // braces matter: recent Chromium returns a Promise here, and React would call it as the cleanup (black screen)
  useEffect(() => { form.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }) }, [])

  const change = (id: string, patch: Partial<Row>) =>
    setRows(rs => rs.map(r => (r.product.id === id ? { ...r, ...patch, invalid: false } : r)))

  function save(e: FormEvent) {
    e.preventDefault()
    const valid = rows.flatMap(r => {
      const amount = parseAmount(r.amount)
      return amount === null ? [] : [{ product: r.product, amount, unit: r.unit }]
    })
    const left = rows.filter(r => parseAmount(r.amount) === null).map(r => ({ ...r, invalid: true }))
    if (valid.length) onSaved(freezeBought(valid, today))
    if (!left.length) return onDone()
    setRows(left)
  }

  return (
    <form className="card" onSubmit={save} ref={form}>
      <div className="card-title">🧊 Para o congelador</div>
      <p className="small muted" style={{ marginTop: 0 }}>Um saco por produto, como veio. Em casa podem dividir.</p>
      {rows.map(r => (
        <div key={r.product.id} style={{ marginBottom: 10 }}>
          <div className="inline" style={{ alignItems: 'center' }}>
            <strong className="grow">{r.product.name}</strong>
            <input className="input" inputMode="decimal" placeholder="ex.: 2,5" aria-label={`Quantidade de ${r.product.name}`}
              value={r.amount} onChange={e => change(r.product.id, { amount: e.target.value })} style={{ width: 90, flex: 'none' }} />
          </div>
          <div className="seg compact" style={{ marginTop: 6 }}>
            {UNITS.map(u => (
              <button type="button" key={u.value} className={r.unit === u.value ? 'on' : ''}
                aria-label={`${r.product.name}: ${u.label}`} onClick={() => change(r.product.id, { unit: u.value })}>{u.label}</button>
            ))}
          </div>
          {r.invalid && <p className="small error">Quantidade inválida</p>}
        </div>
      ))}
      <button className="btn primary block">Guardar</button>
      <button type="button" className="link-btn" onClick={onDone}>Agora não</button>
    </form>
  )
}
