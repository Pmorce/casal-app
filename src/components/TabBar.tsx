import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/', icon: '🏠', label: 'Hoje' },
  { to: '/compras', icon: '🛒', label: 'Compras' },
  { to: '/congelador', icon: '🧊', label: 'Congelador' },
  { to: '/casa', icon: '🥫', label: 'Casa' },
  { to: '/mais', icon: '☰', label: 'Mais' },
]

export default function TabBar() {
  return (
    <nav className="tabbar">
      {TABS.map(t => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => (isActive ? 'tab on' : 'tab')}>
          <span className="tab-icon">{t.icon}</span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
