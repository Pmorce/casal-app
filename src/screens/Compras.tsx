import { useCallback, useState, type FormEvent } from 'react'
import { useCollection } from '../data/useCollection'
import { useSession } from '../data/session'
import { useToday } from '../hooks/useToday'
import { addItem, classifyItem, deleteItem, finish, markMissing, snooze, toggleCart, undoFinish } from '../data/shoppingRepo'
import { restore } from '../data/restore'
import { backToCasa, maybeMissing } from '../domain/shopping'
import { GROUP_LABEL, groupByZone, guessZone, ZONES } from '../domain/zones'
import type { Product, ShoppingItem, Zone } from '../domain/types'
import UndoToast from '../components/UndoToast'
import SpentForm from '../components/SpentForm'

type ZonePick = Zone | 'oneOff'
const PICKS: { value: ZonePick; short: string }[] = [...ZONES, { value: 'oneOff', short: 'Só desta vez' }]

/** One tap to say where a product lives; `label` prefixes the accessible names when several pickers are on screen. */
function ZonePicker({ selected, onPick, label }: { selected?: ZonePick; onPick: (z: ZonePick) => void; label?: string }) {
  return (
    <div className="seg compact" style={{ marginTop: 6 }}>
      {PICKS.map(z => (
        <button type="button" key={z.value} className={selected === z.value ? 'on' : ''}
          aria-label={label ? `${label}: ${z.short}` : undefined} onClick={() => onPick(z.value)}>{z.short}</button>
      ))}
    </div>
  )
}

export default function Compras() {
  const { uid, members } = useSession()
  const today = useToday()
  const items = useCollection<ShoppingItem>('shopping')
  const products = useCollection<Product>('products')
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  // a new name waits here for its zone (pre-selected guess) before anything is written
  const [guess, setGuess] = useState<Zone | null>(null)
  const [undo, setUndo] = useState<{ message: string; run: () => void } | null>(null)
  const closeUndo = useCallback(() => setUndo(null), [])
  // after "Terminar compras": ask how much it was, straight into Gastos
  const [askSpent, setAskSpent] = useState(false)

  const groups = groupByZone(items.filter(i => i.status === 'porComprar'), products)
  const todoCount = groups.reduce((n, g) => n + g.items.length, 0)
  const cart = items.filter(i => i.status === 'carrinho').sort((a, b) => a.text.localeCompare(b.text, 'pt-PT'))
  const missing = maybeMissing(products, items, today)
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

  function terminate() {
    const done = finish(items, products, today)
    setAskSpent(true)
    setUndo({ message: 'Compras terminadas', run: () => { undoFinish(done); setAskSpent(false) } })
  }

  const row = (i: ShoppingItem, picker = false) => (
    <div key={i.id}>
      <div className="row">
        <button className={i.status === 'carrinho' ? 'check on' : 'check'} aria-label={i.text} onClick={() => toggleCart(i)}>
          {i.status === 'carrinho' ? '✓' : ''}
        </button>
        <div className={i.status === 'carrinho' ? 'grow done-text' : 'grow'}>{i.text}</div>
        {i.status === 'porComprar' && <span className="small muted">{members[i.addedBy] ?? ''}</span>}
        {i.status === 'porComprar' && <button className="link-btn" aria-label={`Apagar ${i.text}`} onClick={() => remove(i)}>✕</button>}
      </div>
      {picker && <ZonePicker label={i.text} onPick={z => classifyItem(i, z, products)} />}
    </div>
  )

  return (
    <>
      <h1>Lista de compras</h1>

      <form className="inline" onSubmit={submit} style={{ marginBottom: 6 }}>
        <input className="input" list="sugestoes" placeholder="+ Adicionar (ex.: Leite)" value={text}
          onChange={e => { setText(e.target.value); setMsg(''); setGuess(null) }} />
        <button className="btn primary" aria-label="Adicionar">+</button>
      </form>
      <datalist id="sugestoes">
        {products.map(p => <option key={p.id} value={p.name} />)}
      </datalist>
      {msg && <p className="small error">{msg}</p>}
      {guess && (
        <div className="card">
          <div className="small">Onde fica «{text.trim()}»?</div>
          <ZonePicker selected={guess} onPick={pickZone} />
        </div>
      )}

      <div className="card" style={{ marginTop: 10 }}>
        <div className="card-title">Por comprar <span className="pill">{todoCount}</span></div>
        {!todoCount && <p className="muted small">Nada por comprar 🎉</p>}
        {groups.map(g => (
          <div key={g.group}>
            <h3 className="zone-title">{GROUP_LABEL[g.group]}</h3>
            {g.items.map(i => row(i, g.group === 'semZona'))}
          </div>
        ))}
      </div>

      {missing.length > 0 && (
        <div className="card">
          <div className="card-title">Talvez falte <span className="pill">{missing.length}</span></div>
          {missing.map(m => {
            const { product } = m
            return (
            <div className="row" key={product.id}>
              <div className="grow">
                {product.name}
                <div className="note">{m.reason === 'congelador' ? 'não há no congelador' : `costuma durar ~${m.gap} dias · vai em ${m.since}`}</div>
              </div>
              <button className="btn small primary" onClick={() => markMissing(product, uid, items)}>Falta</button>
              <button className="btn small" onClick={() => snooze(product, today)}>Ainda há</button>
            </div>
            )
          })}
        </div>
      )}

      {/* where the cart was, i.e. right under the finger that tapped "Terminar compras" */}
      {askSpent && <SpentForm title="✓ Compras terminadas. Quanto foi?" today={today} onDone={() => setAskSpent(false)} />}

      {cart.length > 0 && (
        <>
          <div className="card">
            <div className="card-title">No carrinho</div>
            {cart.map(i => row(i))}
            <p className="small muted">Para tirar do carrinho, toca outra vez no ✓.</p>
          </div>
          <button className="btn primary block" onClick={terminate}>✓ Terminar compras ({cart.length})</button>
          <p className="small muted" style={{ textAlign: 'center' }}>
            {toCasa.length
              ? `Sai tudo da lista. Fica registado em Casa que compraram: ${toCasa.join(', ')}.`
              : 'Sai tudo da lista. Nada disto está em Casa, por isso Casa não muda.'}
          </p>
        </>
      )}

      {undo && <UndoToast message={undo.message} onUndo={undo.run} onClose={closeUndo} />}
    </>
  )
}
