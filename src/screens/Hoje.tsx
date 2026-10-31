import { Link } from 'react-router-dom'
import { useSession } from '../data/session'
import { useToday } from '../hooks/useToday'
import { useHour } from '../hooks/useHour'
import { useCollection } from '../data/useCollection'
import { longDate } from '../domain/dates'
import { greeting, momentLine, periodAt } from '../domain/look'
import { routineProgress } from '../domain/routines'
import { dueChores } from '../domain/chores'
import { maybeMissing } from '../domain/shopping'
import { unlinkOrphans } from '../domain/freezer'
import type { Chore, FreezerBag, Product, Routine, RoutineCheck, ShoppingItem } from '../domain/types'
import PageHeader from '../components/PageHeader'
import { Couple } from '../components/Avatar'
import Icon from '../components/Icon'
import RoutineToday from '../components/RoutineToday'
import ChoresToday from '../components/ChoresToday'

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
  const cooked = bags.filter(b => b.category === 'feita').length

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
