import { useState, type FormEvent } from 'react'
import { parseAmount, type BagOrigin } from '../domain/freezer'
import type { FreezerUnit } from '../domain/types'

const num = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 })
const UNIT_LABEL = { un: 'un.', g: 'g', kg: 'kg', doses: 'doses' } as const

const ORIGINS: { value: BagOrigin; label: string }[] = [
  { value: 'comprei', label: 'Comprei' },
  { value: 'cozinhei', label: 'Cozinhei' },
  { value: 'ofereceram', label: 'Ofereceram' },
]

/**
 * "+" in the Congelador: "De onde veio?" (spec §5.4). The amount starts as the newest bag's; only "Comprei"
 * shows the store, and it is optional (tap again to unpick). "+ outra" is a plain input and button, not a form,
 * since it sits inside this one.
 */
export default function OriginSheet({ name, unit, initialAmount, defaultOrigin, stores, onAddCustom, onSave, onCancel }: {
  name: string
  unit: FreezerUnit
  initialAmount: number
  defaultOrigin: BagOrigin
  stores: string[]
  onAddCustom: (store: string) => void
  onSave: (origin: BagOrigin, amount: number, store?: string) => void
  onCancel: () => void
}) {
  const [origin, setOrigin] = useState<BagOrigin>(defaultOrigin)
  const [amount, setAmount] = useState(num.format(initialAmount).replace(/\s/g, ''))
  const [store, setStore] = useState<string | null>(null)
  const [extra, setExtra] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [custom, setCustom] = useState('')
  const [error, setError] = useState('')
  const unitLabel = UNIT_LABEL[unit]
  const options = [...stores, ...extra.filter(s => !stores.includes(s))]

  function addCustom() {
    const clean = custom.trim()
    if (!clean) return
    onAddCustom(clean)
    setExtra(e => [...e, clean])
    setStore(clean)
    setAdding(false)
    setCustom('')
  }

  function save(e: FormEvent) {
    e.preventDefault()
    const n = parseAmount(amount)
    if (n === null) return setError('Quantidade inválida')
    onSave(origin, n, origin === 'comprei' && store ? store : undefined)
  }

  return (
    <form className="bag-form sheet" aria-label={`De onde veio? ${name}`} onSubmit={save}
      onKeyDown={e => { if (e.key === 'Escape') onCancel() }}>
      <h3 className="card-title">De onde veio?</h3>
      <div className="seg">
        {ORIGINS.map(o => (
          <button type="button" key={o.value} className={origin === o.value ? 'on' : ''} aria-pressed={origin === o.value}
            onClick={() => setOrigin(o.value)}>{o.label}</button>
        ))}
      </div>
      <div className="bag-form-row">
        <span className="bag-amount">
          <input className="input" inputMode="decimal" aria-label={`Quantidade (${unitLabel})`} value={amount}
            onChange={e => { setAmount(e.target.value); setError('') }} />
          <span>{unitLabel}</span>
        </span>
      </div>
      {origin === 'comprei' && (
        <>
          <div className="seg compact" role="group" aria-label="Loja (opcional)">
            {options.map(s => (
              <button type="button" key={s} className={store === s ? 'on' : ''} aria-pressed={store === s}
                onClick={() => setStore(store === s ? null : s)}>{s}</button>
            ))}
            {!adding && <button type="button" onClick={() => setAdding(true)}>+ outra</button>}
          </div>
          {adding && (
            <div className="inline">
              <input className="input" placeholder="Nome da loja" aria-label="Nome da loja" value={custom} autoFocus
                onChange={e => setCustom(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }} />
              <button type="button" className="btn primary" onClick={addCustom}>Confirmar</button>
            </div>
          )}
        </>
      )}
      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="link-btn" onClick={onCancel}>Cancelar</button>
        <button className="btn primary small">Guardar</button>
      </div>
    </form>
  )
}
