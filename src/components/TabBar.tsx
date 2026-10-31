import type { CSSProperties } from 'react'
import { NavLink } from 'react-router-dom'
import Icon, { type IconName } from './Icon'

// each tab's icon patch in its own pastel (two-colour icons)
const TABS: { to: string; icon: IconName; label: string; tint: string }[] = [
  { to: '/', icon: 'hoje', label: 'Hoje', tint: 'var(--pessego-bg)' },
  { to: '/compras', icon: 'compras', label: 'Compras', tint: 'var(--pessego-bg)' },
  { to: '/congelador', icon: 'congelador', label: 'Congelador', tint: 'var(--ceu-bg)' },
  { to: '/casa', icon: 'casa', label: 'Casa', tint: 'var(--rosa-bg)' },
  { to: '/mais', icon: 'mais', label: 'Mais', tint: 'var(--rosa-bg)' },
]

/** Leaving an editor with unsaved changes asks first (see useUnsavedChanges). */
export default function TabBar() {
  return (
    <nav className="tabbar">
      {TABS.map(t => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => (isActive ? 'tab on' : 'tab')}>
          <span className="tab-pill" style={{ '--icon-tint': t.tint, '--icon-tint-opacity': 1 } as CSSProperties}><Icon name={t.icon} /></span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
