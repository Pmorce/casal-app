import { useState, type FormEvent } from 'react'
import { addPart, clearParts, ensureMeatProduct, removePart } from '../data/shoppingRepo'
import { freezeDefaults, parseAmount, UNITS } from '../domain/freezer'
import { meatTypes, partLabel } from '../domain/meat'
import type { FreezerUnit, Product, ShoppingItem } from '../domain/types'
import Icon from './Icon'

interface Props {
  item: ShoppingItem
  /** the item's product (Congelador meat/fish, maybe generic) */
  own: Product
  products: Product[]
  /** store of the trip, if there is one */
  store?: string
  onClose: () => void
}

const OUTRO = '+outro'

/**
 * "Carne — o que levas?": opens under the meat row instead of ticking it. In the common case it is two taps:
 * the type is already picked, the amount pre-filled from its last entry, then "Pôr no carrinho".
 */
export default function MeatCard({ item, own, products, store, onClose }: Props) {
  const types = meatTypes(own, products)
  const first = types[0]
  const [typeId, setTypeId] = useState(first ? first.id : OUTRO)
  const [other, setOther] = useState('')
  const [{ amount, unit }, setQty] = useState<{ amount: string; unit: FreezerUnit }>(first ? freezeDefaults(first) : { amount: '', unit: 'un' })
  const parts = item.parts ?? []
  const type = types.find(t => t.id === typeId)
  const value = parseAmount(amount)
  const ready = value !== null && (type || other.trim())

  function pick(t: Product) {
    setTypeId(t.id)
    setQty(freezeDefaults(t))
  }

  function pickOther() {
    setTypeId(OUTRO)
    // a new type has no last amount: start in units (almôndegas, hambúrgueres…); kg is one tap away
    setQty({ amount: '', unit: 'un' })
  }

  function put(e: FormEvent) {
    e.preventDefault()
    if (value === null) return
    const chosen = type ? { id: type.id, name: type.name } : other.trim() ? ensureMeatProduct(other, products) : null
    if (!chosen) return
    addPart(item, { productId: chosen.id, name: chosen.name, amount: value, unit, ...(store ? { store } : {}) })
    onClose()
  }

  function clearAll() {
    clearParts(item)
    onClose()
  }

  return (
    <form className="card" onSubmit={put}>
      <h2 className="card-title">{item.text} — o que levas?</h2>
      <div className="field">
        <span>Tipo</span>
        <div className="seg compact">
          {types.map(t => (
            <button type="button" key={t.id} className={typeId === t.id ? 'on' : ''} aria-pressed={typeId === t.id}
              aria-label={`Tipo: ${t.name}`} onClick={() => pick(t)}>{t.name}</button>
          ))}
          <button type="button" className={typeId === OUTRO ? 'on' : ''} aria-pressed={typeId === OUTRO} onClick={pickOther}>+ outro</button>
        </div>
        {typeId === OUTRO && (
          <input className="input" placeholder="ex.: Almôndegas" aria-label="Nome do tipo" value={other} autoFocus={types.length > 0}
            onChange={e => setOther(e.target.value)} />
        )}
      </div>
      <div className="field">
        <span>Quanto</span>
        <input className="input" inputMode="decimal" placeholder="ex.: 2,5" aria-label="Quantidade" value={amount}
          onChange={e => setQty(q => ({ ...q, amount: e.target.value }))} />
        <div className="seg compact">
          {UNITS.map(u => (
            <button type="button" key={u.value} className={unit === u.value ? 'on' : ''} aria-pressed={unit === u.value}
              onClick={() => setQty(q => ({ ...q, unit: u.value }))}>{u.label}</button>
          ))}
        </div>
      </div>
      <button className="btn primary block" disabled={!ready}>Pôr no carrinho</button>
      {parts.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="small muted">Já levas:</div>
          {parts.map(p => (
            <div className="row" key={p.id}>
              <div className="grow">{partLabel(p)}{p.store ? ` (${p.store})` : ''}</div>
              <button type="button" className="x-btn" aria-label={`Tirar ${partLabel(p)}`} onClick={() => removePart(item, p.id)}><Icon name="x" /></button>
            </div>
          ))}
        </div>
      )}
      {(parts.length > 0 || item.status === 'carrinho') && (
        <button type="button" className="btn ghost block" onClick={clearAll}>Tirar tudo do carrinho</button>
      )}
      <button type="button" className="btn ghost block" onClick={onClose}>Cancelar</button>
    </form>
  )
}
