import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../data/session'
import { useToday } from '../hooks/useToday'
import { useHour } from '../hooks/useHour'
import { useCollection } from '../data/useCollection'
import { addDays, longDate } from '../domain/dates'
import { greeting, momentLine, periodAt } from '../domain/look'
import { routineProgress } from '../domain/routines'
import { dueChores } from '../domain/chores'
import { maybeMissing } from '../domain/shopping'
import { unlinkOrphans } from '../domain/freezer'
import { fridgeDays, FRIDGE_WARN_DAYS, inFridge, porContar } from '../domain/stock'
import type { Chore, FreezerBag, Product, Routine, RoutineCheck, ShoppingItem } from '../domain/types'
import PageHeader from '../components/PageHeader'
import { Couple } from '../components/Avatar'
import Icon from '../components/Icon'
import RoutineToday from '../components/RoutineToday'
import ChoresToday from '../components/ChoresToday'

const POSTPONED_KEY = 'contar.adiado'

/** "Agora não" was tapped less than 7 days ago; without storage the card simply shows. */
function postponed(today: string): boolean {
  try {
    const until = localStorage.getItem(POSTPONED_KEY)
    return !!until && today < until
  } catch { return false }
}

export default function Hoje() {
  const { uid, name } = useSession()
  const today = useToday()
  const hour = useHour()
  const items = useCollection<ShoppingItem>('shopping')
  const bags = useCollection<FreezerBag>('freezerBags')
  const products = useCollection<Product>('products')
  const routines = useCollection<Routine>('routines', ['ownerUid', '==', uid])
  const checks = useCollection<RoutineCheck>('routineChecks', ['dateKey', '==', today])
  const chores = useCollection<Chore>('chores')
  const toBuy = items.filter(i => i.status === 'porComprar').length
  const missing = maybeMissing(products, items, today, unlinkOrphans(bags, products)).length
  const [hidden, setHidden] = useState(false)
  const pending = products.filter(p => p.qtyPending).length
  const eatFirst = inFridge(unlinkOrphans(bags, products)).filter(b => fridgeDays(b, today) >= FRIDGE_WARN_DAYS).length
  const toCount = porContar(products).length
  const askCount = toCount > 0 && !hidden && !postponed(today)
  const cooked = bags.filter(b => b.category === 'feita').length

  function notNow() {
    try { localStorage.setItem(POSTPONED_KEY, addDays(today, 7)) } catch { /* storage blocked: it just comes back */ }
    setHidden(true)
  }

  const period = periodAt(hour)
  const { done, total } = routineProgress(routines, checks, today, period)
  const moment = momentLine({ period, routine: total ? { done, total } : null, choresDue: dueChores(chores, today).length, maybeMissing: missing })

  return (
    <>
      <PageHeader title={`${greeting(hour)}, ${name}`} right={<Couple />}
        sub={<>{longDate(today)}<p className="hero-msg">{moment}</p></>} />
      <div className="lift">
        <RoutineToday ownerUid={uid} day={today} />
        <ChoresToday />
        {pending > 0 && (
          <Link to="/casa?pendentes=1" className="card freezer-link">
            <span className="grow">Faltam quantidades de {pending} {pending === 1 ? 'produto' : 'produtos'}</span>
            <span className="chev"><Icon name="seta" size={18} /></span>
          </Link>
        )}
        {eatFirst > 0 && (
          <Link to="/casa?tab=frigorifico" className="card freezer-link">
            <span className="grow">Para comer primeiro: {eatFirst}</span>
            <span className="chev"><Icon name="seta" size={18} /></span>
          </Link>
        )}
        {askCount && (
          <div className="card">
            <div className="card-title">Vamos contar a casa?</div>
            <p className="small muted">Faltam {toCount} {toCount === 1 ? 'produto' : 'produtos'} · 5 minutos</p>
            <div className="form-actions">
              <button className="btn small" onClick={notNow}>Agora não</button>
              <Link to="/contar" className="btn small soft">Começar</Link>
            </div>
          </div>
        )}
        <div className="tiles">
          <Link to="/compras" className="tile pessego">
            <Icon name="compras" size={24} />
            <div className="tile-n">{toBuy}</div>
            <div className="tile-l">na lista</div>
            {missing > 0 && <div className="tile-sub">{missing} talvez {missing === 1 ? 'falte' : 'faltem'}</div>}
          </Link>
          <Link to="/congelador" className="tile ceu">
            <Icon name="congelador" size={24} />
            <div className="tile-n">{cooked}</div>
            <div className="tile-l">comida feita</div>
          </Link>
        </div>
      </div>
    </>
  )
}
