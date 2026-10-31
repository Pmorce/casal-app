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
import PageHeader from '../components/PageHeader'
import Icon, { Badge, type IconName, type Tone } from '../components/Icon'
import NovoSaco from './NovoSaco'

const num = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 })
const UNIT_LABEL = { un: 'un.', g: 'g', kg: 'kg', doses: 'doses' } as const
const ptNum = (n: number) => num.format(n).replace(/\s/g, '')
// the category's icon by each group (spec §3.4); Comida feita is pêssego, the others the Congelador's céu (§3.1)
const CATEGORY_LOOK: Record<FreezerBag['category'], { icon: IconName; tone: Tone }> = {
  carne: { icon: 'peixe', tone: 'ceu' },
  feita: { icon: 'panela', tone: 'pessego' },
  outros: { icon: 'floco', tone: 'ceu' },
}

/** «{n} sacos · {k} para gastar primeiro» over every category; k = groups whose oldest bag is old. */
function headerSub(bags: FreezerBag[], today: DateKey): string {
  const n = `${bags.length} ${bags.length === 1 ? 'saco' : 'sacos'}`
  const k = groupBags(bags).filter(g => isOld(g.bags[0], today)).length
  return k ? `${n} · ${k} para gastar primeiro` : n
}

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
  // `ended`: the group whose last bag was taken out; its question is answered with the list as it is then (render time)
  const [undo, setUndo] = useState<{ message: string; run: () => void; ended?: FreezerGroup } | null>(null)
  const [fixing, setFixing] = useState<string | null>(null)
  const [splitting, setSplitting] = useState<string | null>(null)
  const closeUndo = useCallback(() => setUndo(null), [])
  const ended = undo?.ended

  const groups = groupBags(bags).filter(g => g.category === category)
  const names = [...new Set(bags.map(b => b.name))]

  function minus(g: FreezerGroup) {
    const wasLast = g.bags.length === 1
    const bag = removeOldest(g)
    if (!wasLast) return setUndo({ message: 'Saco retirado', run: () => restoreBag(bag) })
    // the last one: asked at the bottom of the screen, always in view (a card at the top was missed)
    setUndo({ message: `Acabou ${g.name}`, run: () => restoreBag(bag), ended: g })
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
      <PageHeader title="Congelador" sub={headerSub(bags, today)} />
      <div className="lift">
        <div className="seg cats">
          {CATEGORIES.map(c => (
            <button key={c.value} className={category === c.value ? 'on' : ''} onClick={() => setCategory(c.value)}>{c.label}</button>
          ))}
        </div>

        {adding ? (
          <NovoSaco category={category} names={names} today={today} onDone={() => setAdding(false)} />
        ) : (
          <button className="btn dashed block" onClick={() => setAdding(true)}>+ Novo saco</button>
        )}

        {!groups.length && <p className="muted center" style={{ minHeight: 120 }}>Nada aqui ainda.</p>}
        {groups.map(g => {
          const oldest = g.bags[0]
          const look = CATEGORY_LOOK[g.category]
          return (
            <div className="card" key={g.key}>
              <div className="group">
                <Badge icon={look.icon} tone={look.tone} />
                <button className="group-open" onClick={() => setOpen(open === g.key ? null : g.key)}>
                  <strong className="product-name">{g.name}</strong>
                  <span className="note">{summary(g)}</span>
                  {isOld(oldest, today) && <span className="old-tag"><Icon name="relogio" />mais antigo {age(oldest.addedKey, today)}</span>}
                </button>
                {/* − {bags} +: one round selector, its buttons keep a 44px hit area */}
                <span className="stepper">
                  <button aria-label={`Tirar um saco de ${g.name}`} onClick={() => minus(g)}><Icon name="menos" /></button>
                  <b>{g.bags.length}</b>
                  <button aria-label={`Mais um saco de ${g.name}`} onClick={() => addSameAsLast(g, today)}><Icon name="mais1" /></button>
                </span>
              </div>
              {open === g.key && (
                <div className="bags">
                  {g.bags.map((b, i) => {
                    if (fixing === b.id) return <FixBag key={b.id} bag={b} today={today} onDone={() => setFixing(null)} />
                    if (splitting === b.id) return <SplitBag key={b.id} bag={b} onSplit={amounts => split(b, amounts)} onCancel={() => setSplitting(null)} />
                    const what = `${num.format(b.amount)} ${UNIT_LABEL[b.unit]}, entrou ${age(b.addedKey, today)}`
                    // distinct names: a group often has several identical bags (screen readers)
                    const label = (verb: string) => `${verb} o saco ${i + 1} (${what})`
                    return (
                      <div className="bag" key={b.id}>
                        <span className="grow">{num.format(b.amount)} {UNIT_LABEL[b.unit]} · entrou {age(b.addedKey, today)}</span>
                        <span className="bag-actions">
                          <button className="link-btn" aria-label={label('Corrigir')} onClick={() => { setSplitting(null); setFixing(b.id) }}>Corrigir</button>
                          {maxSplit(b.amount) >= 2 && (
                            <button className="link-btn" aria-label={label('Dividir')} onClick={() => { setFixing(null); setSplitting(b.id) }}>Dividir</button>
                          )}
                          <button className="link-btn" aria-label={label('Apagar')}
                            onClick={() => { deleteBag(b.id); setUndo({ message: 'Saco apagado', run: () => restoreBag(b) }) }}>Apagar</button>
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {undo && (
        <UndoToast message={undo.message} onUndo={undo.run} onClose={closeUndo}
          action={ended && { label: 'Pôr na lista', run: () => answerList(ended, true) }}
          onDismiss={ended && (() => answerList(ended, false))} />
      )}
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
    <form className="bag-form small" onSubmit={save}>
      <div className="bag-form-row">
        <span className="stepper">
          <button type="button" aria-label="Menos sacos" onClick={() => setCount(Math.max(2, count - 1))}><Icon name="menos" /></button>
          <b>{count}</b>
          <button type="button" aria-label="Mais sacos" onClick={() => setCount(Math.min(most, count + 1))}><Icon name="mais1" /></button>
        </span>
        <span>sacos de</span>
        <span className="bag-amount">
          <input className="input" inputMode="decimal" aria-label="Quantidade por saco" value={typed ?? ptNum(parts[0])}
            onChange={e => { setTyped(e.target.value); setError('') }} />
          <span>{UNIT_LABEL[bag.unit]}</span>
        </span>
      </div>
      {newTotal !== null && newTotal !== bag.amount && (
        <p className="note">Total: {ptNum(newTotal)} {UNIT_LABEL[bag.unit]} (era {ptNum(bag.amount)} {UNIT_LABEL[bag.unit]})</p>
      )}
      {error && <p className="error">{error}</p>}
      <div className="form-actions">
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
    <form className="bag-form small" onSubmit={save}>
      <div className="bag-form-row">
        <span className="bag-amount">
          <input className="input" inputMode="decimal" aria-label="Quantidade" value={amount}
            onChange={e => { setAmount(e.target.value); setError('') }} />
          <span>{UNIT_LABEL[bag.unit]}</span>
        </span>
        <input className="input" type="date" aria-label="Data de entrada" max={today} value={addedKey}
          onChange={e => { setAddedKey(e.target.value); setError('') }} />
      </div>
      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="link-btn" onClick={onDone}>Cancelar</button>
        <button className="btn primary small">Guardar</button>
      </div>
    </form>
  )
}
