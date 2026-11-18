import { useId, useState, type FormEvent } from 'react'
import { cleanText } from '../domain/shopping'

export interface CookedInput {
  name: string
  freezerDoses: number
  fridgeDoses: number
}

/** Whole doses: empty is 0; anything else that is not a whole number is invalid (null). */
function doses(s: string): number | null {
  const t = s.trim()
  if (!t) return 0
  return /^\d{1,2}$/.test(t) ? Number(t) : null
}

/** "Cozinhei" (spec §5.5): what was made and how many doses went to the freezer and to the fridge. */
export default function CookedForm({ origin, names, onSave, onNothing, onCancel }: {
  origin?: string
  names: string[]
  onSave: (input: CookedInput) => void
  onNothing: () => void
  /** closes the form and keeps the bag (Escape, "Cancelar") */
  onCancel: () => void
}) {
  const listId = useId()
  const [name, setName] = useState('')
  const [freezer, setFreezer] = useState('')
  const [fridge, setFridge] = useState('')
  const f = doses(freezer)
  const r = doses(fridge)
  const clean = cleanText(name)
  const ok = !!clean && f !== null && r !== null && f + r > 0

  function save(e: FormEvent) {
    e.preventDefault()
    if (clean && f !== null && r !== null && f + r > 0) onSave({ name: clean, freezerDoses: f, fridgeDoses: r })
  }

  return (
    <form className="bag-form sheet" onSubmit={save} onKeyDown={e => { if (e.key === 'Escape') onCancel() }}>
      <h3 className="card-title">{origin ? `Cozinhei com ${origin}` : 'Cozinhei'}</h3>
      <p className="note">Guardaste alguma coisa?</p>
      <div className="bag-form-row">
        <label className="grow" htmlFor={`${listId}-n`}>O que fizeste</label>
        <input id={`${listId}-n`} className="input" list={listId} autoComplete="off" value={name} onChange={e => setName(e.target.value)} />
        <datalist id={listId}>{names.map(n => <option key={n} value={n} />)}</datalist>
      </div>
      <div className="bag-form-row">
        <label className="grow" htmlFor={`${listId}-f`}>Para o congelador</label>
        <span className="bag-amount">
          <input id={`${listId}-f`} className="input" inputMode="numeric" autoComplete="off" value={freezer} onChange={e => setFreezer(e.target.value)} />
          <span>doses</span>
        </span>
      </div>
      <div className="bag-form-row">
        <label className="grow" htmlFor={`${listId}-r`}>Para o frigorífico</label>
        <span className="bag-amount">
          <input id={`${listId}-r`} className="input" inputMode="numeric" autoComplete="off" value={fridge} onChange={e => setFridge(e.target.value)} />
          <span>doses</span>
        </span>
      </div>
      <div className="form-actions">
        <button type="button" className="link-btn" onClick={onCancel}>Cancelar</button>
        <button type="button" className="link-btn" onClick={onNothing}>Não guardámos nada</button>
        <button className="btn primary small" disabled={!ok}>Guardar</button>
      </div>
    </form>
  )
}
