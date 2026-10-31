import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon from './Icon'

type Back = {
  to: string
  label: string
  /**
   * Editors: go back in history (a POP, which useUnsavedChanges still guards) instead of pushing `to`,
   * so a discarded new item's editor is not left behind for Android Back to reopen. Nothing behind: push `to`.
   */
  history?: boolean
}

type Props = {
  title: string
  sub?: ReactNode
  /** Secondary screens: a ‹ back link (still a Link, so useUnsavedChanges keeps guarding it) and a lower header. */
  back?: Back
  right?: ReactNode
}

/** The coloured header that opens each screen (spec §3.5); put what follows in `.lift` to float it over the header. */
export default function PageHeader({ title, sub, back, right }: Props) {
  return (
    <header className={back ? 'hero compact' : 'hero'}>
      {back && <BackLink {...back} />}
      <div className="hero-text">
        <h1>{title}</h1>
        {sub && <div className="hero-sub">{sub}</div>}
      </div>
      {right && <div className="hero-right">{right}</div>}
    </header>
  )
}

// its own component: the router hooks only run when there is a back link (ErrorBoundary's header has none)
function BackLink({ to, label, history }: Back) {
  const navigate = useNavigate()
  // `idx` is the position React Router's browser/hash histories keep in window.history.state: > 0 means an in-app
  // entry behind. After a reload the editor can be entry 0 (its location key survives the reload, so it is no signal).
  const idx = (window.history.state as { idx?: number } | null)?.idx
  const pop = history && typeof idx === 'number' && idx > 0
  return (
    <Link to={to} className="hero-back" aria-label={label}
      onClick={pop ? e => { e.preventDefault(); navigate(-1) } : undefined}>
      <Icon name="voltar" />
    </Link>
  )
}
