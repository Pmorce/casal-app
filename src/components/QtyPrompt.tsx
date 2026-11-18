import { useState, type FormEvent } from 'react'

export interface QtyPromptProps {
  /** "Quantos há?" or "Quantos compraste?" */
  title: string
  /** the product it is about */
  name: string
  /** 0 for "Quantos há?", 1 for "Quantos compraste?" */
  min: 0 | 1
  initial?: number
  onSave: (n: number) => void
  onCancel: () => void
}

/** A whole number ≥ min, or null. */
export function parseQty(text: string, min: number): number | null {
  const t = text.trim()
  if (!/^\d+$/.test(t)) return null
  const n = Number(t)
  return n >= min ? n : null
}

/** Small inline form under a Casa row for a number of units/packs. */
export default function QtyPrompt({ title, name, min, initial, onSave, onCancel }: QtyPromptProps) {
  const [text, setText] = useState(initial === undefined ? '' : String(initial))
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const n = parseQty(text, min)
    if (n === null) return setError(min > 0 ? 'Escreve um número inteiro maior que 0' : 'Escreve um número inteiro')
    onSave(n)
  }

  return (
    <form className="qty-form" aria-label={`${title} ${name}`} onSubmit={submit}
      onKeyDown={e => { if (e.key === 'Escape') onCancel() }}>
      <label className="qty-label">
        <span>{title}</span>
        <input className="input" inputMode="numeric" autoComplete="off" value={text} autoFocus
          onChange={e => { setText(e.target.value); setError('') }} />
      </label>
      {error && <p className="small error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn small" onClick={onCancel}>Cancelar</button>
        <button className="btn small soft">Guardar</button>
      </div>
    </form>
  )
}
