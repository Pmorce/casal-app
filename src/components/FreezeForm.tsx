import { useEffect, useRef, useState, type FormEvent } from 'react'
import { freezeBought, type FrozenBatch } from '../data/freezerRepo'
import { amountWas, formatAmount, freezeDefaults, parseAmount, UNITS } from '../domain/freezer'
import type { DateKey } from '../domain/dates'
import type { FreezerUnit, Product } from '../domain/types'
import { Badge } from './Icon'

interface Edit { amount?: string; unit?: FreezerUnit; invalid?: boolean }

/** One line of the card: a product, or one part of it (two parts of the same product are two rows). */
export interface FreezeInput { key: string; product: Product; amount?: number; unit?: FreezerUnit; purchaseId?: string }

interface Props {
  rows: FreezeInput[]
  today: DateKey
  /** what was just saved, so the screen can undo it */
  onSaved: (done: FrozenBatch) => void
  onDone: () => void
}

/**
 * "Para o congelador": what was bought for the freezer goes in as one bag per row, as it came from the shop
 * (dividing happens later, at home). Rows added while it is open (several "Comprei") join it, keeping what was typed.
 * Scrolls itself into view so it is never off-screen.
 */
export default function FreezeForm({ rows: inputs, today, onSaved, onDone }: Props) {
  const [edits, setEdits] = useState<Record<string, Edit>>({})
  const [saved, setSaved] = useState<string[]>([])
  const rows = inputs
    .filter(r => !saved.includes(r.key))
    .map(r => {
      const start = freezeDefaults(r.product)
      const initial = r.amount ? { amount: formatAmount(r.amount), unit: r.unit ?? start.unit } : start
      return { input: r, product: r.product, ...initial, invalid: false, ...edits[r.key] }
    })
  // two parts of the same product share a name: number them so each row has its own accessible name
  const nameOf = (r: { product: Product; input: FreezeInput }) => {
    const same = inputs.filter(i => i.product.name === r.product.name)
    return same.length > 1 ? `${r.product.name} (${same.indexOf(r.input) + 1} de ${same.length})` : r.product.name
  }
  const form = useRef<HTMLFormElement>(null)
  // braces matter: recent Chromium returns a Promise here, and React would call it as the cleanup (black screen)
  useEffect(() => { form.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }) }, [])

  const change = (id: string, patch: Edit) => setEdits(e => ({ ...e, [id]: { ...e[id], ...patch, invalid: false } }))

  function save(e: FormEvent) {
    e.preventDefault()
    const valid = rows.flatMap(r => {
      const amount = parseAmount(r.amount)
      if (amount === null) return []
      const { input } = r
      return [{
        key: input.key, product: r.product, amount, unit: r.unit,
        ...(input.purchaseId ? { purchaseId: input.purchaseId } : {}),
        was: amountWas(input.amount, input.unit),
      }]
    })
    const left = rows.filter(r => parseAmount(r.amount) === null)
    if (valid.length) {
      onSaved(freezeBought(valid.map(({ key: _key, ...v }) => v), today))
      setSaved(s => [...s, ...valid.map(v => v.key)])
    }
    if (!left.length) return onDone()
    setEdits(e => ({ ...e, ...Object.fromEntries(left.map(r => [r.input.key, { ...e[r.input.key], invalid: true }])) }))
  }

  return (
    <form className="card" onSubmit={save} ref={form}>
      <div className="card-head">
        <Badge icon="congelador" tone="ceu" />
        <div className="grow">
          <h2>Para o congelador</h2>
          <div className="note">Um saco por produto, como veio. Em casa podem dividir.</div>
        </div>
      </div>
      {rows.map(r => (
        <div className="freeze-row" key={r.input.key}>
          <div className="freeze-head">
            <strong className="grow product-name">{r.product.name}</strong>
            <input className="input" inputMode="decimal" placeholder="ex.: 2,5" aria-label={`Quantidade de ${nameOf(r)}`}
              value={r.amount} onChange={e => change(r.input.key, { amount: e.target.value })} />
          </div>
          <div className="seg compact" style={{ marginTop: 6 }}>
            {UNITS.map(u => (
              <button type="button" key={u.value} className={r.unit === u.value ? 'on' : ''}
                aria-label={`${nameOf(r)}: ${u.label}`} onClick={() => change(r.input.key, { unit: u.value })}>{u.label}</button>
            ))}
          </div>
          {r.invalid && <p className="small error">Quantidade inválida</p>}
        </div>
      ))}
      <button className="btn primary block">Guardar</button>
      <button type="button" className="btn ghost block" onClick={onDone}>Agora não</button>
    </form>
  )
}
