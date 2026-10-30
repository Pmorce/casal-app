import { useCallback, useState, type FormEvent } from 'react'
import { useCollection } from '../data/useCollection'
import { useSession } from '../data/session'
import { useToday } from '../hooks/useToday'
import { addProduct, boughtOutside, deleteProduct, markMissing, moveProduct, renameProduct, setFreezerCategory, snooze, undoBought } from '../data/shoppingRepo'
import { restore } from '../data/restore'
import { checkRename } from '../domain/pantry'
import { rhythmOf, stockStatus, type StockStatus } from '../domain/rhythm'
import { bagsOfProduct, bagsSummary } from '../domain/freezer'
import SpentForm from '../components/SpentForm'
import FreezeForm from '../components/FreezeForm'
import { freezerCategoryOf, ZONES } from '../domain/zones'
import type { DateKey } from '../domain/dates'
import type { FreezerBag, Product, ShoppingItem, Zone } from '../domain/types'
import UndoToast from '../components/UndoToast'

const STATUS: { value: StockStatus; title: string }[] = [
  { value: 'falta', title: '🔴 Falta' },
  { value: 'talvez', title: '🟠 Talvez falte' },
  { value: 'ha', title: '🟢 Há' },
]
const ZONE_SHORT = Object.fromEntries(ZONES.map(z => [z.value, z.short])) as Record<Zone, string>
const byName = (list: Product[]) => [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-PT'))

function lateNote(p: Product, today: DateKey): string {
  const { gap, since } = rhythmOf(p, today)
  return `dura ~${gap} dias · vai em ${since}`
}

/** What the app knows about how often it is bought. */
function rhythmNote(p: Product, today: DateKey): string {
  const { gap, since } = rhythmOf(p, today)
  if (since === null) return 'nunca comprado'
  const ago = since === 0 ? 'comprado hoje' : `comprado há ${since} ${since === 1 ? 'dia' : 'dias'}`
  return gap === null ? `${ago} · a aprender` : `${ago} · dura ~${gap}`
}

/** Congelador products are known by their bags, not by a rhythm. */
function freezerNote(p: Product, bags: FreezerBag[]): string {
  const mine = bagsOfProduct(p, bags)
  return mine.length ? bagsSummary(mine) : 'não há no congelador'
}

export default function Casa() {
  const { uid } = useSession()
  const today = useToday()
  const products = useCollection<Product>('products')
  const items = useCollection<ShoppingItem>('shopping')
  const bags = useCollection<FreezerBag>('freezerBags')
  const [name, setName] = useState('')
  const [location, setLocation] = useState<Zone>('frigorifico')
  const [msg, setMsg] = useState('')
  const [editing, setEditing] = useState(false)
  const [undo, setUndo] = useState<{ message: string; run: () => void; action?: { label: string; run: () => void } } | null>(null)
  const closeUndo = useCallback(() => setUndo(null), [])
  const [spentFor, setSpentFor] = useState<string | null>(null)
  // "Comprei" on a Congelador product also asks how much went in (closing it does not undo the purchase)
  const [freezing, setFreezing] = useState<Product | null>(null)

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
    setFreezing(p.location === 'congelador' ? p : null)
    setUndo({
      message: `«${p.name}» comprado`,
      run: () => { undoBought(done); setFreezing(null) },
      // offered, not forced: several "Comprei" in a row are often one single purchase
      action: { label: 'Registar gasto', run: () => setSpentFor(p.name) },
    })
  }

  return (
    <>
      <div className="card-title">
        <h1>Casa</h1>
        <button className="link-btn" onClick={() => setEditing(!editing)}>{editing ? 'Concluir' : 'Editar'}</button>
      </div>
      <p className="small muted" style={{ marginTop: -8 }}>
        {editing ? 'Muda o nome ou o sítio; o nome grava ao sair da caixa.' : '"Falta" põe na lista. "Comprei" é para o que compraram fora da lista.'}
      </p>

      {freezing && <FreezeForm key={freezing.id} products={[freezing]} today={today} onSaved={() => {}} onDone={() => setFreezing(null)} />}
      {spentFor && <SpentForm title={`Quanto custou «${spentFor}»?`} today={today} onDone={() => setSpentFor(null)} />}

      {editing ? ZONES.map(zone => {
        const list = byName(products.filter(p => p.location === zone.value))
        return (
          <div className="card" key={zone.value}>
            <div className="card-title">{zone.label}</div>
            {!list.length && <p className="small muted">Sem produtos ainda.</p>}
            {list.map(p => <EditRow key={p.id} product={p} products={products} items={items} onDelete={() => remove(p)} />)}
          </div>
        )
      }) : (
        <>
          {!products.length && <p className="small muted">Sem produtos ainda.</p>}
          {STATUS.map(st => {
            const list = byName(products.filter(p => stockStatus(p, items, today, bags) === st.value))
            if (!list.length) return null
            return (
              <div className="card" key={st.value}>
                <h3 className="zone-title">{st.title} ({list.length})</h3>
                {list.map(p => (
                  <div className="row" key={p.id}>
                    <div className="grow">
                      {p.name} <span className="zone-tag">{ZONE_SHORT[p.location]}</span>
                      <div className="note">
                        {p.location === 'congelador' ? freezerNote(p, bags) : st.value === 'talvez' ? lateNote(p, today) : rhythmNote(p, today)}
                      </div>
                    </div>
                    {st.value !== 'falta' && (
                      <button className="btn small" aria-label={`Falta ${p.name}`} onClick={() => markMissing(p, uid, items)}>Falta</button>
                    )}
                    {st.value === 'talvez' && (
                      <button className="btn small" aria-label={`Ainda há ${p.name}`} onClick={() => snooze(p, today)}>Ainda há</button>
                    )}
                    {st.value !== 'talvez' && (
                      <button className="btn small" aria-label={`Comprei ${p.name}`} onClick={() => bought(p)}>Comprei</button>
                    )}
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

      {undo && <UndoToast message={undo.message} onUndo={undo.run} onClose={closeUndo} action={undo.action} />}
    </>
  )
}

function EditRow({ product, products, items, onDelete }: { product: Product; products: Product[]; items: ShoppingItem[]; onDelete: () => void }) {
  const [name, setName] = useState(product.name)
  const [error, setError] = useState('')

  function commit() {
    if (name === product.name) return
    const r = checkRename(product, name, products)
    if ('error' in r) return setError(r.error)
    setName(r.ok)
    if (r.ok !== product.name) renameProduct(product, r.ok, items)
  }

  return (
    <div className="row" style={{ flexWrap: 'wrap' }}>
      <input className="input grow" aria-label={`Nome de ${product.name}`} value={name}
        onChange={e => { setName(e.target.value); setError('') }} onBlur={commit}
        onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} style={{ minWidth: 0, flex: 1 }} />
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
