export type Period = 'manha' | 'noite'

export function greeting(hour: number): 'Bom dia' | 'Boa tarde' | 'Boa noite' {
  if (hour >= 6 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 20) return 'Boa tarde'
  return 'Boa noite'
}

/** Morning routine until 15:00, evening after. */
export const periodAt = (hour: number): Period => (hour < 15 ? 'manha' : 'noite')

export type MomentInput = {
  period: Period
  /** The viewer's own steps for this period today; null when there are none. */
  routine: { done: number; total: number } | null
  choresDue: number
  maybeMissing: number
}

export function momentLine({ period, routine, choresDue, maybeMissing }: MomentInput): string {
  const name = period === 'manha' ? 'manhã' : 'noite'
  if (routine && routine.total - routine.done === 1) return `Falta só um passo para fechares a ${name} ✨`
  if (routine && routine.total > 0 && routine.done === routine.total) {
    return `${name === 'manhã' ? 'Manhã' : 'Noite'} fechada. Bom trabalho ✨`
  }
  if (choresDue > 0) return `Hoje há ${choresDue} ${choresDue === 1 ? 'tarefa' : 'tarefas'} da casa`
  if (maybeMissing > 0) {
    return `${maybeMissing} ${maybeMissing === 1 ? 'coisa pode' : 'coisas podem'} estar a acabar`
  }
  return 'Dia tranquilo por aqui'
}

export type MemberColor = { bg: string; ink: string; initial: string }

/** First colour goes to the first uid alphabetically, second to the second. Swap the order here if needed. */
export const MEMBER_COLORS: readonly { bg: string; ink: string }[] = [
  { bg: '#B9D6E8', ink: '#2E5873' },
  { bg: '#F2B8C6', ink: '#7A3550' },
]

export function memberColor(uid: string, members: Record<string, string>): MemberColor {
  const index = Object.keys(members).sort().indexOf(uid)
  const color = MEMBER_COLORS[index]
  if (!color) return { bg: 'var(--wash)', ink: 'var(--muted)', initial: '?' }
  return { ...color, initial: (members[uid]?.trim()[0] ?? '?').toUpperCase() }
}

export function routinesLine(routines: number, checklists: number): string {
  return `${routines} ${routines === 1 ? 'rotina' : 'rotinas'} · ${checklists} ${checklists === 1 ? 'checklist' : 'checklists'}`
}
