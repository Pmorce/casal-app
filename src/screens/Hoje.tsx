import { Link } from 'react-router-dom'
import { useSession } from '../data/session'
import { useToday } from '../hooks/useToday'
import { useCollection } from '../data/useCollection'
import { WEEKDAY_LABELS_PT, weekdayOf } from '../domain/dates'
import type { FreezerBag, ShoppingItem } from '../domain/types'
import RoutineToday from '../components/RoutineToday'
import ChoresToday from '../components/ChoresToday'

export default function Hoje() {
  const { uid, name } = useSession()
  const today = useToday()
  const items = useCollection<ShoppingItem>('shopping')
  const bags = useCollection<FreezerBag>('freezerBags')
  const toBuy = items.filter(i => i.status === 'porComprar').length
  const cooked = bags.filter(b => b.category === 'feita').length

  return (
    <>
      <h1>Olá {name} · {WEEKDAY_LABELS_PT[weekdayOf(today)]}</h1>
      <RoutineToday ownerUid={uid} day={today} />
      <ChoresToday />
      <div className="card inline" style={{ justifyContent: 'space-between' }}>
        <Link to="/compras" style={{ color: 'inherit', textDecoration: 'none' }}>🛒 {toBuy} {toBuy === 1 ? 'item' : 'itens'} na lista</Link>
        <Link to="/congelador" style={{ color: 'inherit', textDecoration: 'none' }}>🧊 Comida feita: {cooked} {cooked === 1 ? 'saco' : 'sacos'}</Link>
      </div>
    </>
  )
}
