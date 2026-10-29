import { useCallback, useState, type FormEvent } from 'react'
import { useCollection } from '../data/useCollection'
import { useSession } from '../data/session'
import { useToday } from '../hooks/useToday'
import { addProduct, boughtOutside, deleteProduct, markMissing, moveProduct, renameProduct, undoBought } from '../data/shoppingRepo'
import { restore } from '../data/restore'
import { checkRename } from '../domain/pantry'
import { rhythmOf } from '../domain/rhythm'
import { ZONES } from '../domain/zones'
import type { DateKey } from '../domain/dates'
import type { Product, ShoppingItem, Zone } from '../domain/types'
import UndoToast from '../components/UndoToast'

/** What the app knows about how often it is bought. */
function rhythmNote(p: Product, today: DateKey): string {
  const { gap, since } = rhythmOf(p, today)
  if (since === null) return 'nunca comprado'
  const ago = since === 0 ? 'comprado hoje' : `comprado há ${since} ${since === 1 ? 'dia' : 'dias'}`
  return gap === null ? `${ago} · a aprender` : `${ago} · dura ~${gap}`
}

export default function Casa() {
  const { uid } = useSession()
  const today = useToday()
  const products = useCollection<Product>('products')
  const items = useCollection<ShoppingItem>('shopping')
  const [name, setName] = useState('')
  const [location, setLocation] = useState<Zone>('frigorifico')
  const [msg, setMsg] = useState('')
  const [editing, setEditing] = useState(false)
  const [undo, setUndo] = useState<{ message: string; run: () => void } | null>(null)
  const closeUndo = useCallback(() => setUndo(null), [])

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
    setUndo({ message: `«${p.name}» comprado`, run: () => undoBought(done) })
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

      {ZONES.map(zone => {
        const list = products.filter(p => p.location === zone.value).sort((a, b) => a.name.localeCompare(b.name, 'pt-PT'))
        return (
          <div className="card" key={zone.value}>
            <div className="card-title">{zone.label}</div>
            {!list.length && <p className="small muted">Sem produtos ainda.</p>}
            {list.map(p => {
              if (editing) return <EditRow key={p.id} product={p} products={products} items={items} onDelete={() => remove(p)} />
              const listed = items.some(i => i.productId === p.id)
              return (
                <div className="row" key={p.id}>
                  <div className="grow">
                    {p.name}
                    <div className="note">{rhythmNote(p, today)}</div>
                  </div>
                  <button className="btn small" disabled={listed} aria-label={listed ? `${p.name} na lista` : `Falta ${p.name}`}
                    onClick={() => markMissing(p, uid, items)}>{listed ? 'na lista' : 'Falta'}</button>
                  <button className="btn small" aria-label={`Comprei ${p.name}`} onClick={() => bought(p)}>Comprei</button>
                </div>
              )
            })}
          </div>
        )
      })}

      <form className="card" onSubmit={submit}>
        <div className="card-title">+ Produto</div>
        <input className="input" placeholder="Nome (ex.: Leite)" value={name} onChange={e => { setName(e.target.value); setMsg('') }} />
        <div className="seg" style={{ marginTop: 8 }}>
          {ZONES.map(z => (
            <button type="button" key={z.value} className={location === z.value ? 'on' : ''} onClick={() => setLocation(z.value)}>{z.short}</button>
          ))}
        </div>
        {msg && <p className="small error">{msg}</p>}
        <button className="btn primary block">Adicionar</button>
      </form>

      {undo && <UndoToast message={undo.message} onUndo={undo.run} onClose={closeUndo} />}
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
      <button className="link-btn" onClick={onDelete}>Apagar</button>
      {error && <p className="small error" style={{ width: '100%', margin: 0 }}>{error}</p>}
    </div>
  )
}
