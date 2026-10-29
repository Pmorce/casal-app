import { useState, type FormEvent } from 'react'
import { useCollection } from '../data/useCollection'
import { useSession } from '../data/session'
import { addItem, deleteItem, finish, toggleCart } from '../data/shoppingRepo'
import type { Product, ShoppingItem } from '../domain/types'

const REASON_LABEL = { acabou: 'acabou', aAcabar: 'a acabar' } as const

export default function Compras() {
  const { uid, members } = useSession()
  const items = useCollection<ShoppingItem>('shopping')
  const products = useCollection<Product>('products')
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')

  const todo = items.filter(i => i.status === 'porComprar').sort((a, b) => a.text.localeCompare(b.text, 'pt-PT'))
  const cart = items.filter(i => i.status === 'carrinho')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const result = addItem(text, uid, products, items)
    setMsg(result === 'duplicate' ? 'Já está na lista' : '')
    if (result === 'added') setText('')
  }

  const row = (i: ShoppingItem) => (
    <div className="row" key={i.id}>
      <button className={i.status === 'carrinho' ? 'check on' : 'check'} aria-label={i.text} onClick={() => toggleCart(i)}>
        {i.status === 'carrinho' ? '✓' : ''}
      </button>
      <div className={i.status === 'carrinho' ? 'grow done-text' : 'grow'}>{i.text}</div>
      {i.reason && <span className={i.reason === 'acabou' ? 'pill danger' : 'pill warn'}>{REASON_LABEL[i.reason]}</span>}
      {i.status === 'porComprar' && <span className="small muted">{members[i.addedBy] ?? ''}</span>}
      <button className="link-btn" aria-label={`Apagar ${i.text}`} onClick={() => deleteItem(i.id)}>✕</button>
    </div>
  )

  return (
    <>
      <h1>Lista de compras</h1>
      <form className="inline" onSubmit={submit} style={{ marginBottom: 6 }}>
        <input className="input" list="sugestoes" placeholder="+ Adicionar (ex.: Leite)" value={text}
          onChange={e => { setText(e.target.value); setMsg('') }} />
        <button className="btn primary" aria-label="Adicionar">+</button>
      </form>
      <datalist id="sugestoes">
        {products.map(p => <option key={p.id} value={p.name} />)}
      </datalist>
      {msg && <p className="small error">{msg}</p>}

      <div className="card" style={{ marginTop: 10 }}>
        <div className="card-title">Por comprar <span className="pill">{todo.length}</span></div>
        {todo.length ? todo.map(row) : <p className="muted small">Nada por comprar 🎉</p>}
      </div>

      {cart.length > 0 && (
        <>
          <div className="card">
            <div className="card-title">No carrinho</div>
            {cart.map(row)}
          </div>
          <button className="btn primary block" onClick={() => finish(items, products)}>✓ Terminar compras ({cart.length})</button>
          <p className="small muted" style={{ textAlign: 'center' }}>O que está no carrinho sai da lista e volta a "há" em Casa.</p>
        </>
      )}
    </>
  )
}
