import { useCallback, useState, type FormEvent } from 'react'
import { useCollection } from '../data/useCollection'
import { useSession } from '../data/session'
import { useToday } from '../hooks/useToday'
import { addSameAsLast, deleteBag, deleteBags, removeOldest, restoreBag, splitBag, updateBag } from '../data/freezerRepo'
import { addItem, markMissing, snooze } from '../data/shoppingRepo'
import { guessZone } from '../domain/zones'
import { findProduct } from '../domain/shopping'
import { CATEGORIES, groupBags, isOld, maxSplit, parseAmount, splitAmounts, summary, type FreezerGroup } from '../domain/freezer'
import { daysBetween, type DateKey } from '../domain/dates'
import type { FreezerBag, Product, ShoppingItem } from '../domain/types'
import UndoToast from '../components/UndoToast'
import NovoSaco from './NovoSaco'

const num = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 })
const UNIT_LABEL = { un: 'un.', g: 'g', kg: 'kg', doses: 'doses' } as const
const ptNum = (n: number) => num.format(n).replace(/\s/g, '')

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
  const [undo, setUndo] = useState<{
    message: string; run: () => void; action?: { label: string; run: () => void }; dismiss?: () => void
  } | null>(null)
  const [fixing, setFixing] = useState<string | null>(null)
  const [splitting, setSplitting] = useState<string | null>(null)
  const closeUndo = useCallback(() => setUndo(null), [])

  const groups = groupBags(bags).filter(g => g.category === category)
  const names = [...new Set(bags.map(b => b.name))]

  function minus(g: FreezerGroup) {
    const wasLast = g.bags.length === 1
    const bag = removeOldest(g)
    if (!wasLast) return setUndo({ message: 'Saco retirado', run: () => restoreBag(bag) })
    // the last one: asked at the bottom of the screen, always in view (a card at the top was missed)
    setUndo({
      message: `Acabou ${g.name}`,
      run: () => restoreBag(bag),
      action: { label: 'Pôr na lista', run: () => answerList(g, true) },
      dismiss: () => answerList(g, false),
    })
  }

  /** The Casa product the group stands for: linked by its bags, else one with the same name. */
  function productOf(g: FreezerGroup): Product | undefined {
    const linked = g.bags.find(b => b.productId)?.productId
    return products.find(p => p.id === linked) ?? findProduct(g.name, products)
  }

  function answerList(g: FreezerGroup, yes: boolean) {
    const product = productOf(g)
    if (yes && product) markMissing(product, uid, items)
    else if (yes) addItem(g.name, uid, products, items, guessZone(g.name))
    // ✕ on a Congelador product means "ainda há": its "Talvez falte" waits a while
    else if (product?.location === 'congelador') snooze(product, today)
  }

  function split(b: FreezerBag, amounts: number[]) {
    const ids = splitBag(b, amounts)
    setSplitting(null)
    setUndo({ message: `Saco dividido em ${amounts.length}`, run: () => { deleteBags(ids); restoreBag(b) } })
  }

  return (
    <>
      <h1>Congelador</h1>
      <div className="seg">
        {CATEGORIES.map(c => (
          <button key={c.value} className={category === c.value ? 'on' : ''} onClick={() => setCategory(c.value)}>{c.label}</button>
        ))}
      </div>


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
            {open === g.key && g.bags.map((b, i) => {
              if (fixing === b.id) return <FixBag key={b.id} bag={b} today={today} onDone={() => setFixing(null)} />
              if (splitting === b.id) return <SplitBag key={b.id} bag={b} onSplit={amounts => split(b, amounts)} onCancel={() => setSplitting(null)} />
              const what = `${num.format(b.amount)} ${UNIT_LABEL[b.unit]}, entrou ${age(b.addedKey, today)}`
              // distinct names: a group often has several identical bags (screen readers)
              const label = (verb: string) => `${verb} o saco ${i + 1} (${what})`
              return (
                <div className="row small" key={b.id}>
                  <span className="grow">{num.format(b.amount)} {UNIT_LABEL[b.unit]} · entrou {age(b.addedKey, today)}</span>
                  <button className="link-btn" aria-label={label('Corrigir')} onClick={() => { setSplitting(null); setFixing(b.id) }}>Corrigir</button>
                  {maxSplit(b.amount) >= 2 && (
                    <button className="link-btn" aria-label={label('Dividir')} onClick={() => { setFixing(null); setSplitting(b.id) }}>Dividir</button>
                  )}
                  <button className="link-btn" aria-label={label('Apagar')}
                    onClick={() => { deleteBag(b.id); setUndo({ message: 'Saco apagado', run: () => restoreBag(b) }) }}>Apagar</button>
                </div>
              )
            })}
          </div>
        )
      })}

      {undo && <UndoToast message={undo.message} onUndo={undo.run} onClose={closeUndo} action={undo.action} onDismiss={undo.dismiss} />}
    </>
  )
}

/** "Dividir": when the pack is split at home. Equal parts by default (total kept exact); the amount can be typed. */
function SplitBag({ bag, onSplit, onCancel }: { bag: FreezerBag; onSplit: (amounts: number[]) => void; onCancel: () => void }) {
  const most = maxSplit(bag.amount)
  const whole = Number.isInteger(bag.amount) && bag.amount > 1
  const [count, setCount] = useState(Math.min(most, whole ? bag.amount : 2))
  // null = untouched: follows the count, and the last bags take the rounding
  const [typed, setTyped] = useState<string | null>(null)
  const [error, setError] = useState('')
  const parts = splitAmounts(bag.amount, count)
  const typedAmount = typed === null ? null : parseAmount(typed)
  const newTotal = typedAmount === null ? null : Math.round(typedAmount * count * 100) / 100

  function save(e: FormEvent) {
    e.preventDefault()
    if (typed !== null && typedAmount === null) return setError('Quantidade inválida')
    try {
      onSplit(typedAmount === null ? parts : Array.from({ length: count }, () => typedAmount))
    } catch (err) {
      setError(`Não foi possível dividir: ${(err as Error).message}`)
    }
  }

  return (
    <form className="small" onSubmit={save} style={{ padding: '6px 0' }}>
      <div className="inline" style={{ alignItems: 'center' }}>
        <button type="button" className="icon-btn" aria-label="Menos sacos" onClick={() => setCount(Math.max(2, count - 1))}>−</button>
        <strong style={{ minWidth: 24, textAlign: 'center' }}>{count}</strong>
        <button type="button" className="icon-btn" aria-label="Mais sacos" onClick={() => setCount(Math.min(most, count + 1))}>+</button>
        <span>sacos de</span>
        <input className="input" inputMode="decimal" aria-label="Quantidade por saco" value={typed ?? ptNum(parts[0])}
          onChange={e => { setTyped(e.target.value); setError('') }} style={{ flex: 1, minWidth: 0 }} />
        <span>{UNIT_LABEL[bag.unit]}</span>
      </div>
      {newTotal !== null && newTotal !== bag.amount && (
        <p className="note">Total: {ptNum(newTotal)} {UNIT_LABEL[bag.unit]} (era {ptNum(bag.amount)} {UNIT_LABEL[bag.unit]})</p>
      )}
      {error && <p className="error">{error}</p>}
      <div className="inline" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="link-btn" onClick={onCancel}>Cancelar</button>
        <button className="btn primary small">Dividir em {count}</button>
      </div>
    </form>
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
