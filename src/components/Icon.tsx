import type { ReactNode } from 'react'
import type { ListGroup } from '../domain/zones'

// One hand-drawn set on a 24×24 grid: 1.8 stroke, round caps and joins, no fill, currentColor (spec §3.4).
const SNOWFLAKE = <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
const JAR = <><path d="M7 7h10v11.5a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 7 18.5V7Z" /><path d="M6 4.5h12V7H6z" /></>

const PATHS = {
  hoje: <><circle cx="12" cy="12" r="4.2" /><path d="M12 3v1.8M12 19.2V21M3 12h1.8M19.2 12H21M5.6 5.6l1.3 1.3M17.1 17.1l1.3 1.3M5.6 18.4l1.3-1.3M17.1 6.9l1.3-1.3" /></>,
  compras: <><path d="M5 8h14l-1.3 10.2a2 2 0 0 1-2 1.8H8.3a2 2 0 0 1-2-1.8L5 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>,
  congelador: <>{SNOWFLAKE}<path d="M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5" /></>,
  casa: <>{JAR}<path d="M10 12.5h4" /></>,
  mais: <><circle cx="6" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18" cy="12" r="1.3" /></>,
  sol: <path d="M4 17h16M7 17a5 5 0 0 1 10 0M12 7V5M6.3 9.3 5 8M17.7 9.3 19 8" />,
  lua: <><path d="M18.5 14.5A7 7 0 0 1 9.5 5.5a7 7 0 1 0 9 9Z" /><path d="M17 4v3M15.5 5.5h3" /></>,
  vassoura: <><path d="M15 3 10.5 11.5" /><path d="M7 11.5h7l1.5 9H5.5L7 11.5Z" /><path d="M9 15.5v5M12 15.5v5" /></>,
  lista: <><path d="M10 7h9M10 12h9M10 17h9" /><path d="m4 7 1.2 1.2L7.5 6M4 12l1.2 1.2 2.3-2.2M4.5 17h2" /></>,
  euro: <><path d="M17 6.5a6.5 6.5 0 1 0 0 11" /><path d="M4.5 10.5h8M4.5 13.5h8" /></>,
  frigorifico: <><rect x="6" y="3" width="12" height="18" rx="2.5" /><path d="M6 10h12M9 6.5v1.5M9 13v2" /></>,
  despensa: JAR,
  limpeza: <><path d="M8 4h8l-1 4h-6L8 4Z" /><path d="M9 8h6v11a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V8Z" /></>,
  peixe: <><path d="M3 12c3-4 8-5.5 12-3.5 2 1 3.2 2.2 4 3.5-.8 1.3-2 2.5-4 3.5-4 2-9 .5-12-3.5Z" /><path d="M19 12l2.5-2.5v5L19 12Z" /><circle cx="8" cy="11.3" r=".6" /></>,
  panela: <><path d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-6Z" /><path d="M2 10h2M20 10h2M9 6.5c0-1 1-1.5 1-2.5M14 6.5c0-1 1-1.5 1-2.5" /></>,
  floco: <>{SNOWFLAKE}<circle cx="12" cy="12" r="2" /></>,
  check: <path d="m6.5 12.5 3.5 3.5 7.5-8" />,
  x: <path d="M7 7l10 10M17 7 7 17" />,
  mais1: <path d="M12 6v12M6 12h12" />,
  menos: <path d="M6 12h12" />,
  seta: <path d="m10 6 6 6-6 6" />,
  voltar: <path d="m14 6-6 6 6 6" />,
  relogio: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 1.5" /></>,
  sair: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M10 8l-4 4 4 4M6 12h9" /></>,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

/** Decorative: the text next to it (or the button's aria-label) carries the meaning. */
export default function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  )
}

export type Tone = 'pessego' | 'salva' | 'ceu' | 'rosa'

/** An icon in a rounded square of its area's support colour (spec §3.1, §3.4); `label` when the icon alone carries meaning. */
export function Badge({ icon, tone, label }: { icon: IconName; tone: Tone; label?: string }) {
  return <span className={`badge ${tone}`} role={label ? 'img' : undefined} aria-label={label}><Icon name={icon} /></span>
}

/** The icon of each zone, in the shopping list and in Casa. */
export const GROUP_ICON: Record<ListGroup, IconName> = {
  frigorifico: 'frigorifico',
  congelador: 'congelador',
  despensa: 'despensa',
  limpeza: 'limpeza',
  oneOff: 'compras',
  semZona: 'mais',
}
