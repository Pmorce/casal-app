import type { FreezerBag } from '../domain/types'

export type WhereTo = 'descongelar' | 'cozinhar' | 'acabou'

const num = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 })
const UNIT_LABEL = { un: 'un.', g: 'g', kg: 'kg', doses: 'doses' } as const

const OPTIONS: { value: WhereTo; label: string }[] = [
  { value: 'descongelar', label: 'Descongelar' },
  { value: 'cozinhar', label: 'Cozinhar já' },
  { value: 'acabou', label: 'Acabou / deitar fora' },
]

/** "−" in the Congelador: what happens to the oldest bag (spec §5.4). Each option is one tap. */
export default function WhereSheet({ bag, onPick, onCancel }: {
  bag: FreezerBag
  onPick: (where: WhereTo) => void
  onCancel: () => void
}) {
  return (
    <div className="bag-form sheet" role="group" aria-label="Para onde vai?"
      onKeyDown={e => { if (e.key === 'Escape') onCancel() }}>
      <h3 className="card-title">Para onde vai?</h3>
      <p className="note">{bag.name} {num.format(bag.amount).replace(/\s/g, '')} {UNIT_LABEL[bag.unit]}</p>
      <div className="sheet-options">
        {OPTIONS.map(o => <button type="button" key={o.value} className="btn block" onClick={() => onPick(o.value)}>{o.label}</button>)}
      </div>
      <div className="form-actions">
        <button type="button" className="link-btn" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  )
}
