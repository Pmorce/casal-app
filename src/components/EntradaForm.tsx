import { useEffect, useRef, useState, type FormEvent } from 'react'
import { changeCount, clearQtyPending, markQtyPending, setLastQty, setPurchaseQty, type EntradaDone } from '../data/stockRepo'
import type { Product } from '../domain/types'
import { parseQty } from './QtyPrompt'
import { Badge } from './Icon'

interface Props {
  /** counted products bought without a usual quantity, with the purchase row of this "Terminar" */
  rows: { product: Product; purchaseId?: string }[]
  /** what was just written, so the screen can undo it with "Terminar" */
  onSaved?: (done: EntradaDone) => void
  onDone: () => void
}

/**
 * "O que entrou": asked at home, after "Terminar", only for counted products that have no usual quantity yet.
 * The number adds to the count (relative), becomes the usual quantity and goes on the purchase row.
 */
export default function EntradaForm({ rows: inputs, onSaved, onDone }: Props) {
  const [text, setText] = useState<Record<string, string>>({})
  const [invalid, setInvalid] = useState<string[]>([])
  const [saved, setSaved] = useState<string[]>([])
  const rows = inputs.filter(r => !saved.includes(r.product.id))
  const form = useRef<HTMLFormElement>(null)
  // braces matter: recent Chromium returns a Promise here, and React would call it as the cleanup (black screen)
  useEffect(() => { form.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }) }, [])

  const change = (id: string, value: string) => {
    setText(t => ({ ...t, [id]: value }))
    setInvalid(list => list.filter(x => x !== id))
  }

  function save(e: FormEvent) {
    e.preventDefault()
    const valid = rows.flatMap(r => {
      const n = parseQty(text[r.product.id] ?? '', 1)
      return n === null ? [] : [{ ...r, n }]
    })
    const left = rows.filter(r => !valid.some(v => v.product.id === r.product.id))
    if (valid.length) {
      valid.forEach(({ product, purchaseId, n }) => {
        changeCount(product, n)
        setLastQty(product, n)
        if (product.qtyPending) clearQtyPending(product)
        if (purchaseId) setPurchaseQty(purchaseId, n)
      })
      onSaved?.({ saved: valid.map(({ product, n }) => ({ product, n })), pending: [] })
      setSaved(s => [...s, ...valid.map(v => v.product.id)])
    }
    if (!left.length) return onDone()
    setInvalid(left.map(r => r.product.id))
  }

  function later() {
    const pending = rows.map(r => r.product)
    if (pending.length) {
      markQtyPending(pending)
      onSaved?.({ saved: [], pending })
    }
    onDone()
  }

  return (
    <form className="card" onSubmit={save} ref={form}>
      <div className="card-head">
        <Badge icon="casa" tone="salva" />
        <div className="grow">
          <h2>O que entrou</h2>
          <div className="note">Só para o que é novo. Para a próxima já sei.</div>
        </div>
      </div>
      {rows.map(r => (
        <div className="freeze-row" key={r.product.id}>
          <div className="freeze-head">
            <strong className="grow product-name">{r.product.name}</strong>
            <input className="input" inputMode="numeric" autoComplete="off" aria-label={`Unidades de ${r.product.name}`}
              value={text[r.product.id] ?? ''} onChange={e => change(r.product.id, e.target.value)} />
            <span className="muted">un.</span>
          </div>
          {invalid.includes(r.product.id) && <p className="small error">Quantidade inválida</p>}
        </div>
      ))}
      <button className="btn primary block">Guardar</button>
      <button type="button" className="btn ghost block" onClick={later}>Agora não</button>
    </form>
  )
}
