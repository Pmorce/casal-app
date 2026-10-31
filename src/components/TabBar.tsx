import { NavLink } from 'react-router-dom'
import Icon, { type IconName } from './Icon'

const TABS: { to: string; icon: IconName; label: string }[] = [
  { to: '/', icon: 'hoje', label: 'Hoje' },
  { to: '/compras', icon: 'compras', label: 'Compras' },
  { to: '/congelador', icon: 'congelador', label: 'Congelador' },
  { to: '/casa', icon: 'casa', label: 'Casa' },
  { to: '/mais', icon: 'mais', label: 'Mais' },
]

/** Leaving an editor with unsaved changes asks first (see useUnsavedChanges). */
export default function TabBar() {
  return (
    <nav className="tabbar">
      {TABS.map(t => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => (isActive ? 'tab on' : 'tab')}>
          <span className="tab-pill"><Icon name={t.icon} /></span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
