import { useCallback, useState, type FormEvent } from 'react'
import { useCollection } from '../data/useCollection'
import { useSession } from '../data/session'
import { useToday } from '../hooks/useToday'
import { addItem, deleteItem, finish, toggleCart, undoFinish } from '../data/shoppingRepo'
import { restore } from '../data/restore'
import { addExpense } from '../data/expensesRepo'
import { backToCasa } from '../domain/shopping'
import { parseEuros } from '../domain/expenses'
import type { Product, ShoppingItem } from '../domain/types'
import UndoToast from '../components/UndoToast'

const REASON_LABEL = { acabou: 'acabou', aAcabar: 'a acabar' } as const
const byText = (a: ShoppingItem, b: ShoppingItem) => a.text.localeCompare(b.text, 'pt-PT')

export default function Compras() {
  const { uid, members } = useSession()
  const today = useToday()
  const items = useCollection<ShoppingItem>('shopping')
  const products = useCollection<Product>('products')
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const [undo, setUndo] = useState<{ message: string; run: () => void } | null>(null)
  const closeUndo = useCallback(() => setUndo(null), [])
  // after "Terminar compras": ask how much it was, straight into Gastos
  const [askSpent, setAskSpent] = useState(false)
  const [spent, setSpent] = useState('')
  const [who, setWho] = useState(uid)
  const [spentError, setSpentError] = useState('')

  const todo = items.filter(i => i.status === 'porComprar').sort(byText)
  const cart = items.filter(i => i.status === 'carrinho').sort(byText)
  const toCasa = backToCasa(items, products)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const result = addItem(text, uid, products, items)
    setMsg(result === 'duplicate' ? 'Já está na lista' : '')
    if (result === 'added') setText('')
  }

  function remove(i: ShoppingItem) {
    deleteItem(i.id)
    setUndo({ message: `«${i.text}» apagado`, run: () => restore('shopping', [i]) })
  }

  function terminate() {
    const done = finish(items, products)
    setSpent('')
    setSpentError('')
    setWho(uid)
    setAskSpent(true)
    setUndo({ message: 'Compras terminadas', run: () => { undoFinish(done); setAskSpent(false) } })
  }

  function registerSpent(e: FormEvent) {
    e.preventDefault()
    const cents = parseEuros(spent)
    if (cents === null) return setSpentError('Valor inválido')
    addExpense(cents, who, today)
    setAskSpent(false)
  }

  const row = (i: ShoppingItem) => (
    <div className="row" key={i.id}>
      <button className={i.status === 'carrinho' ? 'check on' : 'check'} aria-label={i.text} onClick={() => toggleCart(i)}>
        {i.status === 'carrinho' ? '✓' : ''}
      </button>
      <div className={i.status === 'carrinho' ? 'grow done-text' : 'grow'}>{i.text}</div>
      {i.reason && <span className={i.reason === 'acabou' ? 'pill danger' : 'pill warn'}>{REASON_LABEL[i.reason]}</span>}
      {i.status === 'porComprar' && <span className="small muted">{members[i.addedBy] ?? ''}</span>}
      {i.status === 'porComprar' && <button className="link-btn" aria-label={`Apagar ${i.text}`} onClick={() => remove(i)}>✕</button>}
    </div>
  )

  return (
    <>
      <h1>Lista de compras</h1>

      {askSpent && (
        <form className="card" onSubmit={registerSpent}>
          <div className="card-title">✓ Compras terminadas. Quanto foi?</div>
          <div className="inline">
            <input className="input" inputMode="decimal" placeholder="Valor (ex.: 47,30)" value={spent}
              onChange={e => { setSpent(e.target.value); setSpentError('') }} />
            <button className="btn primary">Registar</button>
          </div>
          <div className="seg" style={{ marginTop: 8 }}>
            {Object.entries(members).map(([id, name]) => (
              <button type="button" key={id} className={who === id ? 'on' : ''} onClick={() => setWho(id)}>{name}</button>
            ))}
          </div>
          {spentError && <p className="small error">{spentError}</p>}
          <button type="button" className="link-btn" onClick={() => setAskSpent(false)}>Agora não</button>
        </form>
      )}

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
            <p className="small muted">Para tirar do carrinho, toca outra vez no ✓.</p>
          </div>
          <button className="btn primary block" onClick={terminate}>✓ Terminar compras ({cart.length})</button>
          <p className="small muted" style={{ textAlign: 'center' }}>
            {toCasa.length
              ? `Sai tudo da lista. Voltam a "há" em Casa: ${toCasa.join(', ')}.`
              : 'Sai tudo da lista. Nada disto está em Casa, por isso Casa não muda.'}
          </p>
        </>
      )}

      {undo && <UndoToast message={undo.message} onUndo={undo.run} onClose={closeUndo} />}
    </>
  )
}
