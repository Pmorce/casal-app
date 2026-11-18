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
import { freezerInCart, unlinkOrphans } from '../domain/freezer'
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
  // after "Terminar compras": first what went to the freezer, then how much it was (one card at a time)
  const [freezing, setFreezing] = useState<Product[] | null>(null)
  const [askSpent, setAskSpent] = useState(false)
  // bags saved from the freezer card; a ref so the undo created before them still sees them
  const savedBags = useRef<FrozenBatch[]>([])
  // the shared trip: a store picker is open to start it or to change store
  const trip = activeTrip(meta, today)
  const [picking, setPicking] = useState<'start' | 'change' | null>(null)
  const stale = staleTrip(meta, today) !== null
  // a trip left from an earlier day is cleared quietly; braces matter (see SpentForm)
  useEffect(() => { if (stale) leaveTrip() }, [stale])

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

  function leave() {
    if (!trip) return
    leaveTrip()
    setUndo({ message: 'Saíste das compras', run: () => restoreTrip(trip) })
  }

  function terminate() {
    const toFreeze = freezerInCart(items, products)
    const done = finish(items, products, today)
    savedBags.current = []
    // a second "Terminar" with the card still open adds to it (what was typed stays)
    setFreezing(open => {
      const all = [...(open ?? []), ...toFreeze.filter(p => !open?.some(o => o.id === p.id))]
      return all.length ? all : null
    })
    setAskSpent(true)
    setUndo({
      message: 'Compras terminadas',
      run: () => { undoFinish(done); savedBags.current.forEach(b => undoFreeze(b)); setFreezing(null); setAskSpent(false) },
    })
  }

  const row = (i: ShoppingItem, picker = false) => (
    <div key={i.id}>
      <div className={i.status === 'carrinho' ? 'row done' : 'row'}>
        <button className={i.status === 'carrinho' ? 'check on' : 'check'} aria-label={i.text} onClick={() => toggleCart(i, trip?.store)}>
          {i.status === 'carrinho' && <Icon name="check" />}
        </button>
        <div className={i.status === 'carrinho' ? 'grow done-text soft' : 'grow'}>{i.text}</div>
        {i.status === 'porComprar' && <Avatar uid={i.addedBy} size="sm" />}
        {i.status === 'porComprar' && <button className="x-btn" aria-label={`Apagar ${i.text}`} onClick={() => remove(i)}><Icon name="x" /></button>}
      </div>
      {picker && <ZonePicker label={i.text} onPick={z => classifyItem(i, z, products)} />}
    </div>
  )

  return (
    <>
      <PageHeader title="Compras" sub={`${todoCount} por comprar · ${cart.length} no carrinho`} />
      <div className="lift">
        <TripBar trip={trip} cartCount={cart.length} onStart={() => setPicking('start')} onChange={() => setPicking('change')} onLeave={leave} />
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
        {askSpent && !freezing && <SpentForm title="Compras terminadas. Quanto foi?" today={today} onDone={() => setAskSpent(false)} />}

        {cart.length > 0 && (
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
