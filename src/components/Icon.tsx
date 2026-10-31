import type { ReactNode } from 'react'
import type { ListGroup } from '../domain/zones'

// One hand-drawn set on a 24×24 grid: 1.8 stroke, round caps and joins, currentColor (spec §3.4).
// Two-colour style: the main shapes get a soft patch of colour (`.tint`, drawn first) under the outline.
const SNOWFLAKE = <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
const tint = (d: string) => <path className="tint" d={d} />

const PATHS = {
  hoje: <>{tint('M12 7.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8Z')}<circle cx="12" cy="12" r="4.4" /><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4" /></>,
  compras: <>{tint('M4.6 8.5h14.8l-1.2 10.4a2.3 2.3 0 0 1-2.3 2H8.1a2.3 2.3 0 0 1-2.3-2L4.6 8.5Z')}<path d="M4.6 8.5h14.8l-1.2 10.4a2.3 2.3 0 0 1-2.3 2H8.1a2.3 2.3 0 0 1-2.3-2L4.6 8.5Z" /><path d="M8.8 8.5V7a3.2 3.2 0 0 1 6.4 0v1.5M9.2 12.5v.01M14.8 12.5v.01" /></>,
  congelador: <>{SNOWFLAKE}<path d="M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5" /></>,
  // a house with a heart in the window: home, not a jar (the jar shapes belong to Despensa)
  casa: <>{tint('M4.5 10.2 12 4.2l7.5 6V19a1.8 1.8 0 0 1-1.8 1.8H6.3A1.8 1.8 0 0 1 4.5 19v-8.8Z')}<path d="M4.5 10.2V19a1.8 1.8 0 0 0 1.8 1.8h11.4a1.8 1.8 0 0 0 1.8-1.8v-8.8" /><path d="M2.8 11.6 12 4.2l9.2 7.4" /><path d="M12 16.6s-2.9-1.6-2.9-3.4c0-1.4 1.7-2 2.9-.8 1.2-1.2 2.9-.6 2.9.8 0 1.8-2.9 3.4-2.9 3.4Z" /></>,
  mais: <>{tint('M4.5 4.5h5.5v5.5H4.5zM14 4.5h5.5v5.5H14zM4.5 14h5.5v5.5H4.5zM14 14h5.5v5.5H14z')}<path d="M4.5 4.5h5.5v5.5H4.5zM14 4.5h5.5v5.5H14zM4.5 14h5.5v5.5H4.5zM14 14h5.5v5.5H14z" /></>,
  sol: <>{tint('M7 17a5 5 0 0 1 10 0Z')}<path d="M4 17h16M7 17a5 5 0 0 1 10 0M12 7V5M6.3 9.3 5 8M17.7 9.3 19 8" /></>,
  lua: <>{tint('M18.5 14.5A7 7 0 0 1 9.5 5.5a7 7 0 1 0 9 9Z')}<path d="M18.5 14.5A7 7 0 0 1 9.5 5.5a7 7 0 1 0 9 9Z" /><path d="M17 4v3M15.5 5.5h3" /></>,
  vassoura: <>{tint('M7 11.5h7l1.5 9H5.5L7 11.5Z')}<path d="M15 3 10.5 11.5" /><path d="M7 11.5h7l1.5 9H5.5L7 11.5Z" /><path d="M9 15.5v5M12 15.5v5" /></>,
  lista: <><path d="M10 7h9M10 12h9M10 17h9" /><path d="m4 7 1.2 1.2L7.5 6M4 12l1.2 1.2 2.3-2.2M4.5 17h2" /></>,
  euro: <><path d="M17 6.5a6.5 6.5 0 1 0 0 11" /><path d="M4.5 10.5h8M4.5 13.5h8" /></>,
  frigorifico: <>{tint('M6.5 2.8h11a1.8 1.8 0 0 1 1.8 1.8v14.8a1.8 1.8 0 0 1-1.8 1.8h-11a1.8 1.8 0 0 1-1.8-1.8V4.6a1.8 1.8 0 0 1 1.8-1.8Z')}<rect x="4.7" y="2.8" width="14.6" height="18.4" rx="1.8" /><path d="M4.7 9.6h14.6M8.2 5.6v1.6M8.2 12.4v2.8" /></>,
  // a jar and a bottle on a shelf
  despensa: <>{tint('M4.6 13.4c0-1.4 1-2.4 2.4-2.4h3.2c1.4 0 2.4 1 2.4 2.4V20H4.6v-6.6ZM14 20v-7.4c0-1.1.6-2 1.5-2.4V8h2.6v2.2c.9.4 1.5 1.3 1.5 2.4V20H14Z')}<path d="M4.6 20v-6.6c0-1.4 1-2.4 2.4-2.4h3.2c1.4 0 2.4 1 2.4 2.4V20M14 20v-7.4c0-1.1.6-2 1.5-2.4V8h2.6v2.2c.9.4 1.5 1.3 1.5 2.4V20" /><path d="M2.8 20.2h18.4M5.4 8.4h6.4v2.6H5.4zM15.2 4.8h3.2V8h-3.2zM7 15.4h3.2M15.6 14.6h2.4" /></>,
  // a spray bottle
  limpeza: <>{tint('M8.6 9.6h6.4v9.6a1.8 1.8 0 0 1-1.8 1.8h-2.8a1.8 1.8 0 0 1-1.8-1.8V9.6Z')}<path d="M8.6 9.6h6.4v9.6a1.8 1.8 0 0 1-1.8 1.8h-2.8a1.8 1.8 0 0 1-1.8-1.8V9.6Z" /><path d="M9.8 9.6V6.4h4.6l2.6 1.8M10.2 4h4.2v2.4M19 5.4v.01M20.6 7.4v.01M19 9.4v.01" /></>,
  peixe: <>{tint('M3 12c3-4 8-5.5 12-3.5 2 1 3.2 2.2 4 3.5-.8 1.3-2 2.5-4 3.5-4 2-9 .5-12-3.5Z')}<path d="M3 12c3-4 8-5.5 12-3.5 2 1 3.2 2.2 4 3.5-.8 1.3-2 2.5-4 3.5-4 2-9 .5-12-3.5Z" /><path d="M19 12l2.5-2.5v5L19 12Z" /><circle cx="8" cy="11.3" r=".6" /></>,
  panela: <>{tint('M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-6Z')}<path d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-6Z" /><path d="M2 10h2M20 10h2M9 6.5c0-1 1-1.5 1-2.5M14 6.5c0-1 1-1.5 1-2.5" /></>,
  floco: <>{SNOWFLAKE}<circle cx="12" cy="12" r="2" /></>,
  check: <path d="m6.5 12.5 3.5 3.5 7.5-8" />,
  x: <path d="M7 7l10 10M17 7 7 17" />,
  mais1: <path d="M12 6v12M6 12h12" />,
  menos: <path d="M6 12h12" />,
  acima: <path d="m6 15 6-6 6 6" />,
  abaixo: <path d="m6 9 6 6 6-6" />,
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
