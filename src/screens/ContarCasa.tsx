import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useCollection } from '../data/useCollection'
import { setCount, setUncounted } from '../data/stockRepo'
import { porContar } from '../domain/stock'
import { ZONES } from '../domain/zones'
import { parseQty } from '../components/QtyPrompt'
import PageHeader from '../components/PageHeader'
import type { Product } from '../domain/types'

/** "Contar a casa": one product at a time, by place. The list is fixed when the screen opens. */
export default function ContarCasa() {
  const products = useCollection<Product>('products')
  const [list, setList] = useState<Product[] | null>(null)
  const [i, setI] = useState(0)
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  // snapshot once the products have arrived, so counting does not reshuffle the list under the user
  useEffect(() => {
    if (list === null && products.length > 0) { setList(porContar(products)) }
  }, [list, products])

  if (list === null) return <PageHeader title="Contar a casa" />

  const p = list[i]
  const next = () => { setI(i + 1); setText(''); setError('') }

  function save(e: FormEvent) {
    e.preventDefault()
    const n = parseQty(text, 0)
    if (n === null) return setError('Escreve um número inteiro')
    setCount(p, n)
    next()
  }

  if (!p) {
    return (
      <>
        <PageHeader title="Casa contada" />
        <div className="lift">
          <div className="card">
            <p>{list.length ? 'Obrigado! Já sei o que há em casa.' : 'Não há nada por contar.'}</p>
            <Link to="/" className="btn primary block">Voltar ao Hoje</Link>
          </div>
        </div>
      </>
    )
  }

  const place = ZONES.find(z => z.value === p.location)?.label ?? ''
  return (
    <>
      <PageHeader title={`Contar a casa · ${i + 1} de ${list.length}`} sub={place} />
      <div className="lift">
        <form className="card" onSubmit={save}>
          <div className="card-title">{p.name}</div>
          <label className="qty-label">
            <span>Quantos há?</span>
            <input className="input" inputMode="numeric" autoComplete="off" autoFocus value={text}
              onChange={e => { setText(e.target.value); setError('') }} />
          </label>
          {error && <p className="small error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn small" onClick={next}>Saltar</button>
            <button type="button" className="btn small" onClick={() => { setUncounted(p, true); next() }}>Não contar este</button>
            <button className="btn small soft">Seguinte</button>
          </div>
        </form>
      </div>
    </>
  )
}
