import Icon from './Icon'
import type { Trip } from '../domain/types'

/** Top of the shopping list: start a trip, or see (and change) where you are. Never required to tick items. */
export default function TripBar({ trip, cartCount, onStart, onChange, onLeave }: {
  trip: Trip | null
  cartCount: number
  onStart: () => void
  onChange: () => void
  onLeave: () => void
}) {
  if (!trip) {
    return <button className="btn soft block" style={{ marginBottom: 12 }} onClick={onStart}><Icon name="compras" />Iniciar compras</button>
  }
  return (
    <div className="card">
      <div className="small"><strong>No {trip.store} · {cartCount} no carrinho</strong></div>
      <div className="inline" style={{ marginTop: 8 }}>
        <button className="btn soft" onClick={onChange}>Mudar de loja</button>
        <button className="btn ghost" onClick={onLeave}>Sair</button>
      </div>
    </div>
  )
}
