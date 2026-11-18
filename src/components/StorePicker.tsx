import { useState, type FormEvent } from 'react'

/** One tap to say where; "+ outra" adds a store of your own. "Não digo" only where leaving it out makes sense. */
export default function StorePicker({ title, options, onPick, allowNone, onAddCustom, onCancel }: {
  title: string
  options: string[]
  onPick: (store: string | null) => void
  allowNone?: boolean
  onAddCustom: (name: string) => void
  onCancel?: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const clean = name.trim()
    if (!clean) return
    onAddCustom(clean)
    onPick(clean)
  }

  return (
    <div className="card">
      <h2 className="card-title">{title}</h2>
      <div className="seg compact">
        {options.map(s => <button type="button" key={s} onClick={() => onPick(s)}>{s}</button>)}
        {!adding && <button type="button" onClick={() => setAdding(true)}>+ outra</button>}
        {allowNone && <button type="button" onClick={() => onPick(null)}>Não digo</button>}
      </div>
      {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Cancelar</button>}
      {adding && (
        <form className="inline" onSubmit={submit}>
          <input className="input" placeholder="Nome da loja" aria-label="Nome da loja" value={name} autoFocus
            onChange={e => setName(e.target.value)} />
          <button className="btn primary">Confirmar</button>
        </form>
      )}
    </div>
  )
}
