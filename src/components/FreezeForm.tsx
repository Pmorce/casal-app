import { useEffect, useRef, useState, type FormEvent } from 'react'
import { freezeBought, type FrozenBatch } from '../data/freezerRepo'
import { freezeDefaults, parseAmount } from '../domain/freezer'
import type { DateKey } from '../domain/dates'
import type { FreezerUnit, Product } from '../domain/types'

const UNITS: { value: FreezerUnit; label: string }[] = [
  { value: 'un', label: 'un.' },
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'doses', label: 'doses' },
]

interface Edit { amount?: string; unit?: FreezerUnit; invalid?: boolean }

interface Props {
  products: Product[]
  today: DateKey
  /** what was just saved, so the screen can undo it */
  onSaved: (done: FrozenBatch) => void
  onDone: () => void
}

/**
 * "Para o congelador": what was bought for the freezer goes in as one bag per product, as it came from the shop
 * (dividing happens later, at home). Products added while it is open (several "Comprei") join it, keeping what was typed.
 * Scrolls itself into view so it is never off-screen.
 */
export default function FreezeForm({ products, today, onSaved, onDone }: Props) {
  const [edits, setEdits] = useState<Record<string, Edit>>({})
  const [saved, setSaved] = useState<string[]>([])
  const rows = products
    .filter(p => !saved.includes(p.id))
    .map(p => ({ product: p, ...freezeDefaults(p), invalid: false, ...edits[p.id] }))
  const form = useRef<HTMLFormElement>(null)
  // braces matter: recent Chromium returns a Promise here, and React would call it as the cleanup (black screen)
  useEffect(() => { form.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }) }, [])

  const change = (id: string, patch: Edit) => setEdits(e => ({ ...e, [id]: { ...e[id], ...patch, invalid: false } }))

  function save(e: FormEvent) {
    e.preventDefault()
    const valid = rows.flatMap(r => {
      const amount = parseAmount(r.amount)
      return amount === null ? [] : [{ product: r.product, amount, unit: r.unit }]
    })
    const left = rows.filter(r => parseAmount(r.amount) === null)
    if (valid.length) {
      onSaved(freezeBought(valid, today))
      setSaved(s => [...s, ...valid.map(v => v.product.id)])
    }
    if (!left.length) return onDone()
    setEdits(e => ({ ...e, ...Object.fromEntries(left.map(r => [r.product.id, { ...e[r.product.id], invalid: true }])) }))
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
