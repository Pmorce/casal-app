import { useCallback, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useCollection } from '../data/useCollection'
import { useSession } from '../data/session'
import { useToday } from '../hooks/useToday'
import { addProduct, boughtOutside, deleteProduct, markMissing, moveProduct, renameProduct, setFreezerCategory, snooze, undoBought, unmakeGeneric } from '../data/shoppingRepo'
import { changeCount, setCount, setLastQty, setPurchaseQty, setUncounted } from '../data/stockRepo'
import { restore } from '../data/restore'
import { checkRename } from '../domain/pantry'
import { MAX_SNOOZES, rhythmOf, shownGap, stockStatus, type StockStatus } from '../domain/rhythm'
import { unlinkOrphans } from '../domain/freezer'
import { COUNTED_ZONES, countState, inFreezer, isCounted, shownCount, staleCount } from '../domain/stock'
import SpentForm from '../components/SpentForm'
import CountStepper from '../components/CountStepper'
import QtyPrompt, { parseQty } from '../components/QtyPrompt'
import { freezerCategoryOf, ZONES } from '../domain/zones'
import type { DateKey } from '../domain/dates'
import type { FreezerBag, Product, ShoppingItem, Zone } from '../domain/types'
import UndoToast from '../components/UndoToast'
import PageHeader from '../components/PageHeader'
import Icon, { Badge, GROUP_ICON, type Tone } from '../components/Icon'

// each state has its colour: the dot by the product (spec §3.1, §5.6)
const STATUS: { value: StockStatus; title: string }[] = [
  { value: 'falta', title: 'Falta' },
  { value: 'talvez', title: 'Talvez falte' },
  { value: 'ha', title: 'Há' },
]
const STATUS_TITLE = Object.fromEntries(STATUS.map(s => [s.value, s.title])) as Record<StockStatus, string>
const STATUS_ORDER = STATUS.map(s => s.value)
const ZONE_TONE: Record<Zone, Tone> = { frigorifico: 'ceu', congelador: 'ceu', despensa: 'pessego', limpeza: 'rosa' }
// Casa is arranged by place; the freezer has its own screen (spec §5.1)
const TABS = ZONES.filter(z => COUNTED_ZONES.includes(z.value))
const TAB_KEY = 'casa.tab'
const byName = (list: Product[]) => [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-PT'))

/** The tab chosen last time on this phone; anything else falls back to Frigorífico. */
function savedTab(): Zone {
  try {
    const t = localStorage.getItem(TAB_KEY)
    if (t && COUNTED_ZONES.includes(t as Zone)) return t as Zone
  } catch { /* storage blocked: start on the first tab */ }
  return 'frigorifico'
}

function lateNote(p: Product, today: DateKey): string {
  const { gap, since } = rhythmOf(p, today)
  return `dura ~${shownGap(gap ?? 0)} dias · vai em ${since}`
}

/** What the app knows about how often it is bought. */
function rhythmNote(p: Product, today: DateKey): string {
  const { gap, since } = rhythmOf(p, today)
  if (since === null) return 'nunca comprado'
  const ago = since === 0 ? 'comprado hoje' : `comprado há ${since} ${since === 1 ? 'dia' : 'dias'}`
  return gap === null ? `${ago} · a aprender` : `${ago} · dura ~${shownGap(gap)}`
}

/** Counted products: the number speaks first, the rhythm only when there is some (spec §5.6). */
function countedNote(p: Product, items: ShoppingItem[], today: DateKey): string {
  const state = countState(p, items, today)
  if (state === 'falta') return shownCount(p) === 0 ? 'acabou · está na lista' : 'está na lista'
  if (state === 'acabou') return 'acabou'
  if (p.qtyPending) return 'falta pôr a quantidade'
  const note = rhythmNote(p, today)
  return staleCount(p, today) ? `${note} · confirma: ainda há ${shownCount(p)}?` : note
}

type Ask = { id: string; kind: 'ha' | 'comprei' }

export default function Casa() {
  const { uid } = useSession()
  const today = useToday()
  const products = useCollection<Product>('products')
  const items = useCollection<ShoppingItem>('shopping')
  const bags = unlinkOrphans(useCollection<FreezerBag>('freezerBags'), products)
  const [tab, setTab] = useState<Zone>(savedTab)
  const [name, setName] = useState('')
  const [location, setLocation] = useState<Zone>(tab)
  const [qty, setQty] = useState('')
  const [msg, setMsg] = useState('')
  const [editing, setEditing] = useState(false)
  const [undo, setUndo] = useState<{ message: string; run: () => void; action?: { label: string; run: () => void } } | null>(null)
  const closeUndo = useCallback(() => setUndo(null), [])
  const [spentFor, setSpentFor] = useState<string | null>(null)
  // "Quantos há?" / "Quantos compraste?" open under one row at a time
  const [ask, setAsk] = useState<Ask | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null)

  function chooseTab(z: Zone) {
    setTab(z)
    setLocation(z)
    setAsk(null)
    setMenuFor(null)
    try { localStorage.setItem(TAB_KEY, z) } catch { /* storage blocked: the tab is just not remembered */ }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const counts = COUNTED_ZONES.includes(location)
    let count: number | undefined
    if (counts && qty.trim()) {
      const n = parseQty(qty, 0)
      if (n === null) return setMsg('"Quantos há?" tem de ser um número inteiro')
      count = n
    }
    const r = addProduct(name, location, products, count)
    setMsg(r === 'duplicate' ? 'Esse produto já existe' : '')
    if (r === 'added') { setName(''); setQty('') }
  }

  function remove(p: Product) {
    const done = deleteProduct(p, items)
    setUndo({
      message: `«${p.name}» apagado${done.items.length ? ' (e da lista)' : ''}`,
      run: () => { restore('products', [done.product]); restore('shopping', done.items) },
    })
  }

  const spentOffer = (p: Product) => ({ label: 'Registar gasto', run: () => setSpentFor(p.name) })

  /** "Comprei" on a product not counted: as before, only the rhythm. */
  function bought(p: Product) {
    const done = boughtOutside(p, items, today, uid)
    setSpentFor(null)
    setUndo({
      message: `«${p.name}» comprado`,
      run: () => undoBought(done),
      // offered, not forced: several "Comprei" in a row are often one single purchase
      action: spentOffer(p),
    })
  }

  /** "Comprei" on a counted product: the purchase plus its units (spec §5.2). */
  function boughtUnits(p: Product, n: number, learned: boolean) {
    const done = boughtOutside(p, items, today, uid)
    changeCount(p, n)
    if (learned) setLastQty(p, n)
    setPurchaseQty(done.purchaseId, n)
    setSpentFor(null)
    setUndo({
      message: `«${p.name}» comprado (+${n})`,
      run: () => { undoBought(done); changeCount(p, -n) },
      action: spentOffer(p),
    })
  }

  // without a usual quantity it asks first: cancelling then records nothing
  function buyCounted(p: Product) {
    setMenuFor(null)
    if (p.lastQty && p.lastQty > 0) boughtUnits(p, p.lastQty, false)
    else setAsk({ id: p.id, kind: 'comprei' })
  }

  // one tap, no question; reaching 0 offers the list (spec §5.2)
  function minus(p: Product) {
    const n = shownCount(p)
    changeCount(p, -1)
    const back = () => changeCount(p, 1)
    if (n > 1) return setUndo({ message: `«${p.name}»: agora ${n - 1}`, run: back })
    const onList = items.some(i => i.productId === p.id)
    setUndo({
      message: `Acabaram os ${p.name}`,
      run: back,
      action: onList ? undefined : { label: 'Pôr na lista', run: () => markMissing(p, uid, items) },
    })
  }

  function plus(p: Product) {
    if (!isCounted(p)) return setAsk({ id: p.id, kind: 'ha' })
    const n = shownCount(p)
    changeCount(p, 1)
    setUndo({ message: `«${p.name}»: agora ${n + 1}`, run: () => changeCount(p, -1) })
  }

  function answer(p: Product, a: Ask, n: number) {
    setAsk(null)
    // a correction never changes the usual quantity; only "Quantos compraste?" teaches it
    if (a.kind === 'ha') setCount(p, n)
    else boughtUnits(p, n, true)
  }

  function productRow(p: Product) {
    const status = stockStatus(p, items, today, bags)
    const counted = isCounted(p)
    const toCount = !counted && !p.uncounted
    const onList = items.some(i => i.productId === p.id)
    const n = shownCount(p)
    const a = ask?.id === p.id ? ask : null
    // Counted rows keep Falta and Comprei in a small menu; at 0 Comprei takes the place of "+"
    const menu = counted ? [!onList && 'falta', n > 0 && 'comprei'].filter(Boolean) : []

    let note: string
    if (counted) note = countedNote(p, items, today)
    else {
      note = status === 'talvez' ? lateNote(p, today) : rhythmNote(p, today)
      if (p.uncounted) note = `sem contar · ${note}`
      if (status === 'ha' && (p.snoozeCount ?? 0) >= MAX_SNOOZES) note += ' · não sugiro até voltarem a comprar'
    }

    return (
      <div key={p.id}>
        <div className="row product">
          <span className={`status-dot ${status}`} aria-hidden="true" />
          <div className="grow">
            <div className="product-name">{p.name}<span className="sr-only"> · {STATUS_TITLE[status]}</span></div>
            <div className="note">{note}</div>
          </div>
          <div className="product-actions">
            {/* not counted: one main action per state, the other one quieter (spec §7.4); the main one sits last, under the thumb */}
            {!counted && status === 'talvez' && (
              <button className="chip quiet" aria-label={`Ainda há ${p.name}`} onClick={() => snooze(p, today)}>Ainda há</button>
            )}
            {!counted && status === 'ha' && (
              <button className="chip quiet" aria-label={`Comprei ${p.name}`} onClick={() => bought(p)}>Comprei</button>
            )}
            {!counted && status !== 'falta' && (
              <button className={status === 'ha' ? 'chip line' : 'chip'} aria-label={`Falta ${p.name}`} onClick={() => markMissing(p, uid, items)}>Falta</button>
            )}
            {!counted && status === 'falta' && (
              <button className="chip" aria-label={`Comprei ${p.name}`} onClick={() => bought(p)}>Comprei</button>
            )}
            {(counted || toCount) && (
              <CountStepper value={n} label={p.name} unknown={toCount} dim={counted && staleCount(p, today)}
                onMinus={() => minus(p)} onPlus={() => plus(p)} onNumber={() => { setMenuFor(null); setAsk({ id: p.id, kind: 'ha' }) }}
                plus={counted && n === 0
                  ? <button className="chip" aria-label={`Comprei ${p.name}`} onClick={() => buyCounted(p)}>Comprei</button>
                  : undefined} />
            )}
            {menu.length > 0 && (
              <button className="more-btn" aria-label={`Mais ações de ${p.name}`} aria-expanded={menuFor === p.id}
                onClick={() => setMenuFor(menuFor === p.id ? null : p.id)}><span aria-hidden="true">⋯</span></button>
            )}
          </div>
        </div>
        {menuFor === p.id && menu.length > 0 && (
          <div className="row-menu">
            {menu.includes('falta') && (
              <button className="chip line" aria-label={`Falta ${p.name}`} onClick={() => { setMenuFor(null); markMissing(p, uid, items) }}>Falta</button>
            )}
            {menu.includes('comprei') && (
              <button className="chip" aria-label={`Comprei ${p.name}`} onClick={() => buyCounted(p)}>Comprei</button>
            )}
          </div>
        )}
        {a && (
          <QtyPrompt key={a.kind} title={a.kind === 'ha' ? 'Quantos há?' : 'Quantos compraste?'} name={p.name}
            min={a.kind === 'ha' ? 0 : 1} initial={a.kind === 'ha' && counted ? n : undefined}
            onSave={v => answer(p, a, v)} onCancel={() => setAsk(null)} />
        )}
      </div>
    )
  }

  const here = products
    .filter(p => p.location === tab && !p.generic)
    .map(p => ({ p, rank: STATUS_ORDER.indexOf(stockStatus(p, items, today, bags)) }))
    .sort((x, y) => x.rank - y.rank || x.p.name.localeCompare(y.p.name, 'pt-PT'))
    .map(x => x.p)
  const freezerBags = inFreezer(bags).length

  return (
    <>
      <PageHeader title="Casa"
        sub={<>O que há e o que está a acabar<p className="hero-help">
          {editing
            ? 'Muda o nome ou o sítio; o nome grava ao sair da caixa.'
            : '"−" quando gastam um; toca no número para corrigir. "Falta" põe na lista.'}
        </p></>}
        right={<button className="btn small" onClick={() => setEditing(!editing)}>{editing ? 'Concluir' : 'Editar'}</button>} />
      <div className="lift">
        {spentFor && <SpentForm title={`Quanto custou «${spentFor}»?`} today={today} onDone={() => setSpentFor(null)} />}

        {editing ? ZONES.map(zone => {
          const list = byName(products.filter(p => p.location === zone.value))
          return (
            <div className="card" key={zone.value}>
              <div className="card-head"><Badge icon={GROUP_ICON[zone.value]} tone={ZONE_TONE[zone.value]} /><h2>{zone.label}</h2></div>
              {!list.length && <p className="small muted">Sem produtos ainda.</p>}
              {list.map(p => <EditRow key={p.id} product={p} products={products} items={items} bags={bags} onDelete={() => remove(p)} />)}
            </div>
          )
        }) : (
          <>
            <div className="seg" role="tablist" aria-label="Sítio">
              {TABS.map(z => (
                <button key={z.value} role="tab" aria-selected={tab === z.value} className={tab === z.value ? 'on' : ''}
                  onClick={() => chooseTab(z.value)}>{z.short}</button>
              ))}
            </div>

            {/* Frigorífico: "Para comer primeiro" (spec §5.7) goes here, above the products */}

            <div className="card">
              <h2 className="state-title">Produtos</h2>
              {!here.length && <p className="small muted">Sem produtos aqui ainda.</p>}
              {here.map(productRow)}
            </div>

            <Link to="/congelador" className="card freezer-link">
              <Badge icon="congelador" tone="ceu" />
              <span className="grow">Congelador: {freezerBags} {freezerBags === 1 ? 'saco' : 'sacos'}</span>
              <span className="chev"><Icon name="seta" size={18} /></span>
            </Link>
          </>
        )}

        <form className="card" onSubmit={submit}>
          <div className="card-title">+ Produto</div>
          <input className="input" placeholder="Nome (ex.: Leite)" value={name} onChange={e => { setName(e.target.value); setMsg('') }} />
          <div className="seg compact" style={{ marginTop: 8 }}>
            {ZONES.map(z => (
              <button type="button" key={z.value} className={location === z.value ? 'on' : ''} onClick={() => setLocation(z.value)}>{z.short}</button>
            ))}
          </div>
          {COUNTED_ZONES.includes(location) && (
            <input className="input" inputMode="numeric" autoComplete="off" placeholder="Quantos há? (opcional)" aria-label="Quantos há? (opcional)"
              value={qty} onChange={e => { setQty(e.target.value); setMsg('') }} style={{ marginBottom: 8 }} />
          )}
          {msg && <p className="small error">{msg}</p>}
          <button className="btn primary block">Adicionar</button>
        </form>

      </div>

      {undo && <UndoToast message={undo.message} onUndo={undo.run} onClose={closeUndo} action={undo.action} />}
    </>
  )
}

function EditRow({ product, products, items, bags, onDelete }: { product: Product; products: Product[]; items: ShoppingItem[]; bags: FreezerBag[]; onDelete: () => void }) {
  const [name, setName] = useState(product.name)
  const [error, setError] = useState('')

  function commit() {
    if (name === product.name) return
    const r = checkRename(product, name, products)
    if ('error' in r) return setError(r.error)
    setName(r.ok)
    if (r.ok !== product.name) renameProduct(product, r.ok, items, bags)
  }

  return (
    <div className="row" style={{ flexWrap: 'wrap' }}>
      <input className="input grow" aria-label={`Nome de ${product.name}`} value={name}
        onChange={e => { setName(e.target.value); setError('') }} onBlur={commit}
        onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} style={{ minWidth: 0, flex: '1 1 160px' }} />
      <select className="input" aria-label={`Sítio de ${product.name}`} value={product.location}
        onChange={e => moveProduct(product, e.target.value as Zone)} style={{ width: 'auto', flex: 'none' }}>
        {ZONES.map(z => <option key={z.value} value={z.value}>{z.short}</option>)}
      </select>
      {product.location === 'congelador' && (
        <select className="input" aria-label={`Tipo de ${product.name}`} value={freezerCategoryOf(product)}
          onChange={e => setFreezerCategory(product, e.target.value as 'carne' | 'outros')} style={{ width: 'auto', flex: 'none' }}>
          <option value="carne">Carne / peixe</option>
          <option value="outros">Outros</option>
        </select>
      )}
      <button className="link-btn" onClick={onDelete}>Apagar</button>
      {product.location !== 'congelador' && (
        // on by default; off = "sem contar", only the rhythm as before (spec §5.1)
        <label className="switch" style={{ width: '100%' }}>
          <input type="checkbox" role="switch" checked={!product.uncounted} aria-label={`Contar quantidades de ${product.name}`}
            onChange={e => setUncounted(product, !e.target.checked)} />
          <span aria-hidden="true">Contar quantidades</span>
        </label>
      )}
      {product.generic && (
        <div className="row" style={{ width: '100%', margin: 0 }}>
          <span className="small muted grow">genérico</span>
          <button className="chip quiet" onClick={() => unmakeGeneric(product)}>Deixar de ser genérico</button>
        </div>
      )}
      {error && <p className="small error" style={{ width: '100%', margin: 0 }}>{error}</p>}
    </div>
  )
}
