import { useCallback, useState, type FormEvent } from 'react'
import { useCollection } from '../data/useCollection'
import { useSession } from '../data/session'
import { useToday } from '../hooks/useToday'
import { addProduct, boughtOutside, deleteProduct, markMissing, moveProduct, renameProduct, setFreezerCategory, snooze, undoBought } from '../data/shoppingRepo'
import { restore } from '../data/restore'
import { checkRename } from '../domain/pantry'
import { MAX_SNOOZES, rhythmOf, shownGap, stockStatus, type StockStatus } from '../domain/rhythm'
import { bagsOfProduct, bagsSummary, unlinkOrphans } from '../domain/freezer'
import SpentForm from '../components/SpentForm'
import FreezeForm from '../components/FreezeForm'
import { freezerCategoryOf, ZONES } from '../domain/zones'
import type { DateKey } from '../domain/dates'
import type { FreezerBag, Product, ShoppingItem, Zone } from '../domain/types'
import UndoToast from '../components/UndoToast'
import PageHeader from '../components/PageHeader'
import { Badge, GROUP_ICON, type Tone } from '../components/Icon'

// each state has its colour: the dot by the title and the zone icon's square (spec §3.1)
const STATUS: { value: StockStatus; title: string; tone: Tone }[] = [
  { value: 'falta', title: 'Falta', tone: 'rosa' },
  { value: 'talvez', title: 'Talvez falte', tone: 'pessego' },
  { value: 'ha', title: 'Há', tone: 'salva' },
]
const ZONE_TONE: Record<Zone, Tone> = { frigorifico: 'ceu', congelador: 'ceu', despensa: 'pessego', limpeza: 'rosa' }
const ZONE_SHORT = Object.fromEntries(ZONES.map(z => [z.value, z.short])) as Record<Zone, string>
const byName = (list: Product[]) => [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-PT'))

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

/** Congelador products are known by their bags, not by a rhythm. */
function freezerNote(p: Product, bags: FreezerBag[], status: StockStatus): string {
  const mine = bagsOfProduct(p, bags)
  if (mine.length) return bagsSummary(mine)
  return status === 'talvez' ? 'não há no congelador' : 'sem sacos registados'
}

export default function Casa() {
  const { uid } = useSession()
  const today = useToday()
  const products = useCollection<Product>('products')
  const items = useCollection<ShoppingItem>('shopping')
  const bags = unlinkOrphans(useCollection<FreezerBag>('freezerBags'), products)
  const [name, setName] = useState('')
  const [location, setLocation] = useState<Zone>('frigorifico')
  const [msg, setMsg] = useState('')
  const [editing, setEditing] = useState(false)
  const [undo, setUndo] = useState<{ message: string; run: () => void; action?: { label: string; run: () => void } } | null>(null)
  const closeUndo = useCallback(() => setUndo(null), [])
  const [spentFor, setSpentFor] = useState<string | null>(null)
  // "Comprei" on Congelador products also asks how much went in, one card for several in a row
  // (closing it does not undo the purchases)
  const [freezing, setFreezing] = useState<Product[]>([])

  function submit(e: FormEvent) {
    e.preventDefault()
    const r = addProduct(name, location, products)
    setMsg(r === 'duplicate' ? 'Esse produto já existe' : '')
    if (r === 'added') setName('')
  }

  function remove(p: Product) {
    const done = deleteProduct(p, items)
    setUndo({
      message: `«${p.name}» apagado${done.items.length ? ' (e da lista)' : ''}`,
      run: () => { restore('products', [done.product]); restore('shopping', done.items) },
    })
  }

  function bought(p: Product) {
    const done = boughtOutside(p, items, today)
    setSpentFor(null)
    if (p.location === 'congelador') setFreezing(f => (f.some(x => x.id === p.id) ? f : [...f, p]))
    setUndo({
      message: `«${p.name}» comprado`,
      run: () => { undoBought(done); setFreezing(f => f.filter(x => x.id !== p.id)) },
      // offered, not forced: several "Comprei" in a row are often one single purchase
      action: { label: 'Registar gasto', run: () => setSpentFor(p.name) },
    })
  }

  return (
    <>
      <PageHeader title="Casa"
        sub={<>O que há e o que está a acabar<p className="hero-help">
          {editing ? 'Muda o nome ou o sítio; o nome grava ao sair da caixa.' : '"Falta" põe na lista. "Comprei" é para o que compraram fora da lista.'}
        </p></>}
        right={<button className="btn small" onClick={() => setEditing(!editing)}>{editing ? 'Concluir' : 'Editar'}</button>} />
      <div className="lift">
        {freezing.length > 0 && <FreezeForm products={freezing} today={today} onSaved={() => {}} onDone={() => setFreezing([])} />}
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
            {!products.length && <p className="card small muted">Sem produtos ainda.</p>}
            {STATUS.map(st => {
              const list = byName(products.filter(p => stockStatus(p, items, today, bags) === st.value))
              if (!list.length) return null
              return (
                <div className="card" key={st.value}>
                  <h3 className="state-title"><span className={`status-dot ${st.value}`} aria-hidden="true" />{st.title} ({list.length})</h3>
                  {list.map(p => (
                    <div className="row product" key={p.id}>
                      <Badge icon={GROUP_ICON[p.location]} tone={st.tone} label={ZONE_SHORT[p.location]} />
                      <div className="grow">
                        <div className="product-name">{p.name}</div>
                        <div className="note">
                          {p.location === 'congelador' ? freezerNote(p, bags, st.value) : st.value === 'talvez' ? lateNote(p, today) : rhythmNote(p, today)}
                          {st.value === 'ha' && (p.snoozeCount ?? 0) >= MAX_SNOOZES && ' · não sugiro até voltarem a comprar'}
                        </div>
                      </div>
                      {/* one main action per state, the other one quieter (spec §7.4); the main one sits last, under the thumb */}
                      <div className="product-actions">
                        {st.value === 'talvez' && (
                          <button className="chip quiet" aria-label={`Ainda há ${p.name}`} onClick={() => snooze(p, today)}>Ainda há</button>
                        )}
                        {st.value === 'ha' && (
                          <button className="chip quiet" aria-label={`Comprei ${p.name}`} onClick={() => bought(p)}>Comprei</button>
                        )}
                        {st.value !== 'falta' && (
                          <button className={st.value === 'ha' ? 'chip line' : 'chip'} aria-label={`Falta ${p.name}`} onClick={() => markMissing(p, uid, items)}>Falta</button>
                        )}
                        {st.value === 'falta' && (
                          <button className="chip" aria-label={`Comprei ${p.name}`} onClick={() => bought(p)}>Comprei</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
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
      {error && <p className="small error" style={{ width: '100%', margin: 0 }}>{error}</p>}
    </div>
  )
}
