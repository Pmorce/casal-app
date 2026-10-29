import { useCallback, useState, type FormEvent } from 'react'
import { useCollection } from '../data/useCollection'
import { useSession } from '../data/session'
import { addProduct, deleteProduct, moveProduct, renameProduct, setProductState } from '../data/shoppingRepo'
import { restore } from '../data/restore'
import { checkRename, needsSync } from '../domain/pantry'
import type { Product, ProductState, ShoppingItem } from '../domain/types'
import UndoToast from '../components/UndoToast'

const STATES: { value: ProductState; label: string }[] = [
  { value: 'ha', label: 'Há' },
  { value: 'aAcabar', label: 'A acabar' },
  { value: 'acabou', label: 'Acabou' },
]
const PLACES: { value: Product['location']; label: string; short: string }[] = [
  { value: 'frigorifico', label: 'Frigorífico', short: 'Frigorífico' },
  { value: 'despensa', label: 'Despensa', short: 'Despensa' },
  { value: 'limpeza', label: 'Limpeza e higiene', short: 'Limpeza' },
]

export default function Casa() {
  const { uid } = useSession()
  const products = useCollection<Product>('products')
  const items = useCollection<ShoppingItem>('shopping')
  const [name, setName] = useState('')
  const [location, setLocation] = useState<Product['location']>('frigorifico')
  const [msg, setMsg] = useState('')
  const [editing, setEditing] = useState(false)
  const [undo, setUndo] = useState<ReturnType<typeof deleteProduct> | null>(null)
  const closeUndo = useCallback(() => setUndo(null), [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const r = addProduct(name, location, products)
    setMsg(r === 'duplicate' ? 'Esse produto já existe' : '')
    if (r === 'added') setName('')
  }

  return (
    <>
      <div className="card-title">
        <h1>Casa</h1>
        <button className="link-btn" onClick={() => setEditing(!editing)}>{editing ? 'Concluir' : 'Editar'}</button>
      </div>
      <p className="small muted" style={{ marginTop: -8 }}>
        {editing ? 'Muda o nome ou o sítio; o nome grava ao sair da caixa.' : 'Marcar "a acabar" ou "acabou" põe na lista de compras.'}
      </p>

      {PLACES.map(place => {
        const list = products.filter(p => p.location === place.value).sort((a, b) => a.name.localeCompare(b.name, 'pt-PT'))
        return (
          <div className="card" key={place.value}>
            <div className="card-title">{place.label}</div>
            {!list.length && <p className="small muted">Sem produtos ainda.</p>}
            {list.map(p => editing ? (
              <EditRow key={p.id} product={p} products={products} items={items} onDelete={() => setUndo(deleteProduct(p, items))} />
            ) : (
              <div className="row" key={p.id}>
                <div className="grow">{p.name}</div>
                <div className="seg compact" style={{ margin: 0, flex: 'none', width: 232 }}>
                  {STATES.map(s => (
                    <button key={s.value} className={p.state === s.value ? 'on' : ''}
                      onClick={() => needsSync(p, s.value, items) && setProductState(p, s.value, items, uid)}>{s.label}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      })}

      <form className="card" onSubmit={submit}>
        <div className="card-title">+ Produto</div>
        <input className="input" placeholder="Nome (ex.: Leite)" value={name} onChange={e => { setName(e.target.value); setMsg('') }} />
        <div className="seg" style={{ marginTop: 8 }}>
          {PLACES.map(pl => (
            <button type="button" key={pl.value} className={location === pl.value ? 'on' : ''} onClick={() => setLocation(pl.value)}>{pl.short}</button>
          ))}
        </div>
        {msg && <p className="small error">{msg}</p>}
        <button className="btn primary block">Adicionar</button>
      </form>

      {undo && <UndoToast message={`«${undo.product.name}» apagado${undo.items.length ? ' (e da lista)' : ''}`}
        onUndo={() => { restore('products', [undo.product]); restore('shopping', undo.items) }} onClose={closeUndo} />}
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
        onChange={e => moveProduct(product, e.target.value as Product['location'])} style={{ width: 'auto', flex: 'none' }}>
        {PLACES.map(pl => <option key={pl.value} value={pl.value}>{pl.short}</option>)}
      </select>
      <button className="link-btn" onClick={onDelete}>Apagar</button>
      {error && <p className="small error" style={{ width: '100%', margin: 0 }}>{error}</p>}
    </div>
  )
}
