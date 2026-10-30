import { Link } from 'react-router-dom'
import { useSession } from '../data/session'
import { useToday } from '../hooks/useToday'
import { useCollection } from '../data/useCollection'
import { WEEKDAY_LABELS_PT, weekdayOf } from '../domain/dates'
import { maybeMissing } from '../domain/shopping'
import { unlinkOrphans } from '../domain/freezer'
import type { FreezerBag, Product, ShoppingItem } from '../domain/types'
import RoutineToday from '../components/RoutineToday'
import ChoresToday from '../components/ChoresToday'

export default function Hoje() {
  const { uid, name } = useSession()
  const today = useToday()
  const items = useCollection<ShoppingItem>('shopping')
  const bags = useCollection<FreezerBag>('freezerBags')
  const products = useCollection<Product>('products')
  const toBuy = items.filter(i => i.status === 'porComprar').length
  const missing = maybeMissing(products, items, today, unlinkOrphans(bags, products)).length
  const cooked = bags.filter(b => b.category === 'feita').length

  return (
    <>
      <h1>Olá {name} · {WEEKDAY_LABELS_PT[weekdayOf(today)]}</h1>
      <RoutineToday ownerUid={uid} day={today} />
      <ChoresToday />
      <div className="card inline" style={{ justifyContent: 'space-between' }}>
        <Link to="/compras" style={{ color: 'inherit', textDecoration: 'none' }}>🛒 {toBuy} na lista{missing > 0 && ` · ${missing} talvez ${missing === 1 ? 'falte' : 'faltem'}`}</Link>
        <Link to="/congelador" style={{ color: 'inherit', textDecoration: 'none' }}>🧊 Comida feita: {cooked} {cooked === 1 ? 'saco' : 'sacos'}</Link>
      </div>
    </>
  )
}
