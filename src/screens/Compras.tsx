import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useCollection } from '../data/useCollection'
import { useSession } from '../data/session'
import { useToday } from '../hooks/useToday'
import { addItem, classifyItem, deleteItem, finish, markMissing, snooze, toggleCart, undoFinish } from '../data/shoppingRepo'
import { restore } from '../data/restore'
import { undoFreeze, type FrozenBatch } from '../data/freezerRepo'
import { addCustomStore, changeStore, leaveTrip, restoreTrip, startTrip } from '../data/tripRepo'
import { backToCasa, maybeMissing } from '../domain/shopping'
import { shownGap } from '../domain/rhythm'
import { unlinkOrphans } from '../domain/freezer'
import { needsStoreQuestion, planFinish } from '../domain/finish'
import { meatProductOf, partsLine } from '../domain/meat'
import { activeTrip, customStores, staleTrip, storeOptions } from '../domain/stores'
import { GROUP_LABEL, groupByZone, guessZone, ZONES } from '../domain/zones'
import type { FreezerBag, Product, Purchase, ShoppingItem, Zone } from '../domain/types'
import UndoToast from '../components/UndoToast'
import SpentForm from '../components/SpentForm'
import FreezeForm from '../components/FreezeForm'
import PageHeader from '../components/PageHeader'
import Avatar from '../components/Avatar'
import Icon, { GROUP_ICON } from '../components/Icon'
import StorePicker from '../components/StorePicker'
import TripBar from '../components/TripBar'
import MeatCard from '../components/MeatCard'

type ZonePick = Zone | 'oneOff'
const PICKS: { value: ZonePick; short: string }[] = [...ZONES, { value: 'oneOff', short: 'Só desta vez' }]

/** One tap to say where a product lives; `label` prefixes the accessible names when several pickers are on screen. */
function ZonePicker({ selected, onPick, label }: { selected?: ZonePick; onPick: (z: ZonePick) => void; label?: string }) {
  return (
    <div className="seg compact zone-picker">
      {PICKS.map(z => (
        <button type="button" key={z.value} className={selected === z.value ? 'on' : ''}
          aria-label={label ? `${label}: ${z.short}` : undefined} onClick={() => onPick(z.value)}>{z.short}</button>
      ))}
    </div>
  )
}

export default function Compras() {
  const { uid } = useSession()
  const today = useToday()
  const items = useCollection<ShoppingItem>('shopping')
  const products = useCollection<Product>('products')
  const bags = useCollection<FreezerBag>('freezerBags')
  const meta = useCollection<{ id: string }>('meta')
  const purchases = useCollection<Purchase>('purchases')
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  // a new name waits here for its zone (pre-selected guess) before anything is written
  const [guess, setGuess] = useState<Zone | null>(null)
  const [undo, setUndo] = useState<{ message: string; run: () => void } | null>(null)
  const closeUndo = useCallback(() => setUndo(null), [])
  // after "Terminar compras": first what went to the freezer, then how much it was, one card per store (null: no store)
  const [freezing, setFreezing] = useState<Product[] | null>(null)
  const [spentQueue, setSpentQueue] = useState<(string | null)[]>([])
  // "Terminar" without a trip and with ticks of no store asks "Onde foi?" first
  const [askingStore, setAskingStore] = useState(false)
  // bags saved from the freezer card; a ref so the undo created before them still sees them
  const savedBags = useRef<FrozenBatch[]>([])
  // the shared trip: a store picker is open to start it or to change store
  const trip = activeTrip(meta, today)
  const [picking, setPicking] = useState<'start' | 'change' | null>(null)
  const stale = staleTrip(meta, today) !== null
  // a trip left from an earlier day is cleared quietly; braces matter (see SpentForm)
  useEffect(() => { if (stale) leaveTrip() }, [stale])
  // the meat card open under its row (one at a time)
  const [meatOpen, setMeatOpen] = useState<string | null>(null)

  // ticked items stay where they are (same alphabetical order) until "Terminar compras"
  const groups = groupByZone(items, products)
  const todoCount = items.filter(i => i.status === 'porComprar').length
  const cart = items.filter(i => i.status === 'carrinho')
  const missing = maybeMissing(products, items, today, unlinkOrphans(bags, products))
  const toCasa = backToCasa(items, products)

  function submit(e: FormEvent) {
    e.preventDefault()
    const result = addItem(text, uid, products, items)
    setMsg(result === 'duplicate' ? 'Já está na lista' : '')
    if (result === 'needsZone') setGuess(guessZone(text))
    if (result === 'added') setText('')
  }

  function pickZone(z: ZonePick) {
    addItem(text, uid, products, items, z)
    setText('')
    setGuess(null)
  }

  function remove(i: ShoppingItem) {
    deleteItem(i.id)
    setUndo({ message: `«${i.text}» apagado`, run: () => restore('shopping', [i]) })
  }

  // one "Onde foi?" on screen at a time: the trip's picker closes the one asked by "Terminar", and the reverse
  function openPicker(kind: 'start' | 'change') {
    setAskingStore(false)
    setPicking(kind)
  }

  function leave() {
    if (!trip) return
    leaveTrip()
    setUndo({ message: 'Saíste das compras', run: () => restoreTrip(trip) })
  }

  function terminate() {
    setPicking(null)
    if (needsStoreQuestion(items, trip)) setAskingStore(true)
    else finishWith(null)
  }

  function finishWith(asked: string | null) {
    setAskingStore(false)
    const plan = planFinish(items, products, { trip, asked, uid, today })
    // until the freezer card takes the plan's rows (pre-filled parts), it gets their products, once each
    const ids = new Set(plan.freezer.map(f => f.productId))
    const toFreeze = products.filter(p => ids.has(p.id)).sort((a, b) => a.name.localeCompare(b.name, 'pt-PT'))
    const done = finish(items, products, plan, today, trip)
    savedBags.current = []
    // a second "Terminar" with the card still open adds to it (what was typed stays)
    setFreezing(open => {
      const all = [...(open ?? []), ...toFreeze.filter(p => !open?.some(o => o.id === p.id))]
      return all.length ? all : null
    })
    setSpentQueue(q => [...q, ...plan.stores.filter(s => !q.includes(s))])
    setUndo({
      message: 'Compras terminadas',
      run: () => { undoFinish(done); savedBags.current.forEach(b => undoFreeze(b)); setFreezing(null); setSpentQueue([]) },
    })
  }

  const row = (i: ShoppingItem, picker = false) => {
    // meat/fish: the check asks "o que levas?" (and reopens it to add or take out a part) instead of ticking
    const meat = meatProductOf(i, products)
    const tap = () => (meat ? setMeatOpen(open => (open === i.id ? null : i.id)) : toggleCart(i, trip?.store))
    return (
      <div key={i.id}>
        <div className={i.status === 'carrinho' ? 'row done' : 'row'}>
          <button className={i.status === 'carrinho' ? 'check on' : 'check'} aria-label={i.text} onClick={tap}>
            {i.status === 'carrinho' && <Icon name="check" />}
          </button>
          <div className={i.status === 'carrinho' ? 'grow done-text soft' : 'grow'}>
            {i.text}
            {i.status === 'carrinho' && !!i.parts?.length && <div className="note">Já levas: {partsLine(i.parts)}</div>}
          </div>
          {i.status === 'porComprar' && <Avatar uid={i.addedBy} size="sm" />}
          {i.status === 'porComprar' && <button className="x-btn" aria-label={`Apagar ${i.text}`} onClick={() => remove(i)}><Icon name="x" /></button>}
        </div>
        {picker && <ZonePicker label={i.text} onPick={z => classifyItem(i, z, products)} />}
        {meat && meatOpen === i.id && (
          <MeatCard item={i} own={meat} products={products} store={trip?.store} onClose={() => setMeatOpen(null)} />
        )}
      </div>
    )
  }

  return (
    <>
      <PageHeader title="Compras" sub={`${todoCount} por comprar · ${cart.length} no carrinho`} />
      <div className="lift">
        <TripBar trip={trip} cartCount={cart.length} onStart={() => openPicker('start')} onChange={() => openPicker('change')} onLeave={leave} />
        {picking && (
          <StorePicker title="Onde foi?" options={storeOptions(customStores(meta), purchases)}
            onCancel={() => setPicking(null)}
            onAddCustom={name => addCustomStore(name, customStores(meta))}
            onPick={store => {
              if (store) { if (picking === 'start') startTrip(store, uid, today); else if (trip) changeStore(trip, store) }
              setPicking(null)
            }} />
        )}
        <form className="add-bar" onSubmit={submit}>
          <input className="input" list="sugestoes" placeholder="+ Adicionar (ex.: Leite)" value={text}
            onChange={e => { setText(e.target.value); setMsg(''); setGuess(null) }} />
          <button className="add-go" aria-label="Adicionar"><Icon name="mais1" /></button>
        </form>
        <datalist id="sugestoes">
          {products.map(p => <option key={p.id} value={p.name} />)}
        </datalist>
        {msg && <p className="card small error">{msg}</p>}
        {guess && (
          <div className="card">
            <div className="small">Onde fica «{text.trim()}»?</div>
            <ZonePicker selected={guess} onPick={pickZone} />
          </div>
        )}

        <div className="card">
          <h2 className="card-title">Por comprar <span className="pill">{todoCount}</span></h2>
          {!todoCount && <p className="muted small">Nada por comprar</p>}
          {groups.map(g => (
            <div key={g.group}>
              <div className="zone-title">
                <Icon name={GROUP_ICON[g.group]} /><h3>{GROUP_LABEL[g.group]}</h3><span className="zone-count">{g.items.filter(i => i.status === 'porComprar').length}</span>
              </div>
              {g.items.map(i => row(i, g.group === 'semZona' && i.status === 'porComprar'))}
            </div>
          ))}
        </div>

        {missing.length > 0 && (
          <div className="card">
            <h2 className="card-title">Talvez falte <span className="pill">{missing.length}</span></h2>
            {missing.map(m => (
              <div className="row product" key={m.product.id}>
                <div className="grow">
                  <div className="product-name">{m.product.name}</div>
                  <div className="note">{m.reason === 'congelador' ? 'não há no congelador' : `costuma durar ~${shownGap(m.gap)} dias · vai em ${m.since}`}</div>
                </div>
                <div className="product-actions">
                  <button className="chip quiet" aria-label={`Ainda há ${m.product.name}`} onClick={() => snooze(m.product, today)}>Ainda há</button>
                  <button className="chip" aria-label={`Falta ${m.product.name}`} onClick={() => markMissing(m.product, uid, items)}>Falta</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* where the cart was, i.e. right under the finger that tapped "Terminar compras" */}
        {freezing && (
          <FreezeForm products={freezing} today={today}
            onSaved={batch => { savedBags.current = [...savedBags.current, batch] }} onDone={() => setFreezing(null)} />
        )}
        {spentQueue.length > 0 && !freezing && (
          // keyed by store: each card starts empty, nothing typed for one store carries to the next
          <SpentForm key={`loja:${spentQueue[0] ?? ''}`} today={today} store={spentQueue[0] ?? undefined}
            title={spentQueue[0] ? `${spentQueue[0]} — quanto foi?` : 'Compras terminadas. Quanto foi?'}
            onDone={() => setSpentQueue(q => q.slice(1))} />
        )}

        {askingStore && (
          <StorePicker title="Onde foi?" allowNone options={storeOptions(customStores(meta), purchases)}
            onCancel={() => setAskingStore(false)}
            onAddCustom={name => addCustomStore(name, customStores(meta))}
            onPick={finishWith} />
        )}
        {cart.length > 0 && !askingStore && (
          <>
            <button className="btn primary block" onClick={terminate}><Icon name="check" />Terminar compras ({cart.length})</button>
            <p className="small muted" style={{ textAlign: 'center' }}>
              {toCasa.length
                ? `Sai tudo da lista. Fica registado em Casa que compraram: ${toCasa.join(', ')}.`
                : 'Sai tudo da lista. Nada disto está em Casa, por isso Casa não muda.'}
            </p>
          </>
        )}
      </div>

      {undo && <UndoToast message={undo.message} onUndo={undo.run} onClose={closeUndo} />}
    </>
  )
}
