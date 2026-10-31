import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'

type Props = {
  title: string
  sub?: ReactNode
  /** Secondary screens: a ‹ back link (still a Link, so useUnsavedChanges keeps guarding it) and a lower header. */
  back?: { to: string; label: string }
  right?: ReactNode
}

/** The coloured header that opens each screen (spec §3.5); put what follows in `.lift` to float it over the header. */
export default function PageHeader({ title, sub, back, right }: Props) {
  return (
    <header className={back ? 'hero compact' : 'hero'}>
      {back && <Link to={back.to} className="hero-back" aria-label={back.label}><Icon name="voltar" /></Link>}
      <div className="hero-text">
        <h1>{title}</h1>
        {sub && <div className="hero-sub">{sub}</div>}
      </div>
      {right && <div className="hero-right">{right}</div>}
    </header>
  )
}
