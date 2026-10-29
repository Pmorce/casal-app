import { useCallback, useState, type FormEvent } from 'react'
import { useCollection } from '../data/useCollection'
import { useSession } from '../data/session'
import { useToday } from '../hooks/useToday'
import { addSameAsLast, deleteBag, removeOldest, restoreBag, updateBag } from '../data/freezerRepo'
import { addItem } from '../data/shoppingRepo'
import { groupBags, isOld, parseAmount, summary, type FreezerGroup } from '../domain/freezer'
import { daysBetween, type DateKey } from '../domain/dates'
import type { FreezerBag, Product, ShoppingItem } from '../domain/types'
import UndoToast from '../components/UndoToast'
import NovoSaco from './NovoSaco'

const num = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 })
const UNIT_LABEL = { un: 'un.', g: 'g', kg: 'kg', doses: 'doses' } as const

function age(addedKey: string, today: string): string {
  const days = daysBetween(addedKey, today)
  if (days < 1) return 'hoje'
  if (days < 31) return `há ${days} dia${days === 1 ? '' : 's'}`
  const months = Math.floor(days / 30)
  return `há ${months} ${months === 1 ? 'mês' : 'meses'}`
}

export default function Congelador() {
  const { uid } = useSession()
  const today = useToday()
  const bags = useCollection<FreezerBag>('freezerBags')
  const products = useCollection<Product>('products')
  const items = useCollection<ShoppingItem>('shopping')
  const [category, setCategory] = useState<FreezerBag['category']>('carne')
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [undo, setUndo] = useState<{ bag: FreezerBag; message: string } | null>(null)
  const [askList, setAskList] = useState<string | null>(null)
  const [fixing, setFixing] = useState<string | null>(null)
  const closeUndo = useCallback(() => setUndo(null), [])

  const groups = groupBags(bags).filter(g => g.category === category)
  const names = [...new Set(bags.map(b => b.name))]

  async function minus(g: FreezerGroup) {
    const wasLast = g.bags.length === 1
    setUndo({ bag: removeOldest(g), message: 'Saco retirado' })
    if (wasLast) setAskList(g.name)
  }

  return (
    <>
      <h1>Congelador</h1>
      <div className="seg">
        <button className={category === 'carne' ? 'on' : ''} onClick={() => setCategory('carne')}>Carne / peixe</button>
        <button className={category === 'feita' ? 'on' : ''} onClick={() => setCategory('feita')}>Comida feita</button>
      </div>

      {askList && (
        <div className="card">
          <div>Acabou <strong>{askList}</strong>. Adicionar à lista de compras?</div>
          <div className="inline" style={{ marginTop: 8 }}>
            <button className="btn primary" onClick={() => { addItem(askList, uid, products, items); setAskList(null) }}>Sim</button>
            <button className="btn" onClick={() => setAskList(null)}>Não</button>
          </div>
        </div>
      )}

      {adding ? (
        <NovoSaco category={category} names={names} today={today} onDone={() => setAdding(false)} />
      ) : (
        <button className="btn block" style={{ marginBottom: 10 }} onClick={() => setAdding(true)}>+ Novo saco</button>
      )}

      {!groups.length && <p className="muted center" style={{ minHeight: 120 }}>Nada aqui ainda.</p>}
      {groups.map(g => {
        const oldest = g.bags[0]
        return (
          <div className="card" key={g.key}>
            <div className="row">
              <button className="grow link-btn" style={{ textAlign: 'left', color: 'inherit', padding: 0 }} onClick={() => setOpen(open === g.key ? null : g.key)}>
                <strong>{g.name}</strong>
                <div className="note">{summary(g)}</div>
                {isOld(oldest, today) && <div className="note" style={{ color: 'var(--danger)' }}>mais antigo entrou {age(oldest.addedKey, today)}</div>}
              </button>
              <button className="icon-btn" aria-label={`Tirar um saco de ${g.name}`} onClick={() => minus(g)}>−</button>
              <button className="icon-btn" aria-label={`Mais um saco de ${g.name}`} onClick={() => addSameAsLast(g, today)}>+</button>
            </div>
            {open === g.key && g.bags.map(b => fixing === b.id ? (
              <FixBag key={b.id} bag={b} today={today} onDone={() => setFixing(null)} />
            ) : (
              <div className="row small" key={b.id}>
                <span className="grow">{num.format(b.amount)} {UNIT_LABEL[b.unit]} · entrou {age(b.addedKey, today)}</span>
                <button className="link-btn" onClick={() => setFixing(b.id)}>Corrigir</button>
                <button className="link-btn" onClick={() => { deleteBag(b.id); setUndo({ bag: b, message: 'Saco apagado' }) }}>Apagar</button>
              </div>
            ))}
          </div>
        )
      })}

      {undo && <UndoToast message={undo.message} onUndo={() => { restoreBag(undo.bag); setAskList(null) }} onClose={closeUndo} />}
    </>
  )
}

/** Fix a typo in the amount, or the date of a bag that went in before it was registered. */
function FixBag({ bag, today, onDone }: { bag: FreezerBag; today: DateKey; onDone: () => void }) {
  const [amount, setAmount] = useState(String(bag.amount).replace('.', ','))
  const [addedKey, setAddedKey] = useState(bag.addedKey)
  const [error, setError] = useState('')

  function save(e: FormEvent) {
    e.preventDefault()
    const n = parseAmount(amount)
    if (n === null) return setError('Quantidade inválida')
    if (!addedKey || addedKey > today) return setError('A data não pode ser no futuro')
    updateBag(bag, { amount: n, addedKey })
    onDone()
  }

  return (
    <form className="small" onSubmit={save} style={{ padding: '6px 0' }}>
      <div className="inline" style={{ alignItems: 'center' }}>
        <input className="input" inputMode="decimal" aria-label="Quantidade" value={amount}
          onChange={e => { setAmount(e.target.value); setError('') }} style={{ flex: 1 }} />
        <span>{UNIT_LABEL[bag.unit]}</span>
        <input className="input" type="date" aria-label="Data de entrada" max={today} value={addedKey}
          onChange={e => { setAddedKey(e.target.value); setError('') }} style={{ flex: 1 }} />
      </div>
      {error && <p className="error">{error}</p>}
      <div className="inline" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="link-btn" onClick={onDone}>Cancelar</button>
        <button className="btn primary small">Guardar</button>
      </div>
    </form>
  )
}
