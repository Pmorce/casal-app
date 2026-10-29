import { useCallback, useState, type FormEvent } from 'react'
import { useCollection } from '../data/useCollection'
import { useSession } from '../data/session'
import { addProduct, deleteProduct, setProductState } from '../data/shoppingRepo'
import { restore } from '../data/restore'
import { needsSync } from '../domain/pantry'
import type { Product, ProductState, ShoppingItem } from '../domain/types'
import UndoToast from '../components/UndoToast'

const STATES: { value: ProductState; label: string }[] = [
  { value: 'ha', label: 'Há' },
  { value: 'aAcabar', label: 'A acabar' },
  { value: 'acabou', label: 'Acabou' },
]
const PLACES: { value: Product['location']; label: string }[] = [
  { value: 'frigorifico', label: 'Frigorífico' },
  { value: 'despensa', label: 'Despensa' },
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
      <p className="small muted" style={{ marginTop: -8 }}>Marcar "a acabar" ou "acabou" põe na lista de compras.</p>

      {PLACES.map(place => {
        const list = products.filter(p => p.location === place.value).sort((a, b) => a.name.localeCompare(b.name, 'pt-PT'))
        return (
          <div className="card" key={place.value}>
            <div className="card-title">{place.label}</div>
            {!list.length && <p className="small muted">Sem produtos ainda.</p>}
            {list.map(p => (
              <div className="row" key={p.id}>
                <div className="grow">{p.name}</div>
                {editing ? (
                  <button className="link-btn" onClick={() => setUndo(deleteProduct(p, items))}>Apagar</button>
                ) : (
                  <div className="seg compact" style={{ margin: 0, flex: "none", width: 232 }}>
                    {STATES.map(s => (
                      <button key={s.value} className={p.state === s.value ? 'on' : ''}
                        onClick={() => needsSync(p, s.value, items) && setProductState(p, s.value, items, uid)}>{s.label}</button>
                    ))}
                  </div>
                )}
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
            <button type="button" key={pl.value} className={location === pl.value ? 'on' : ''} onClick={() => setLocation(pl.value)}>{pl.label}</button>
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
