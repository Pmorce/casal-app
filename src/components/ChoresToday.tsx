import { useCallback, useState } from 'react'
import { useCollection } from '../data/useCollection'
import { useSession } from '../data/session'
import { useToday } from '../hooks/useToday'
import { markChore, undoChore } from '../data/choresRepo'
import { choreDue } from '../domain/chores'
import type { Chore } from '../domain/types'
import UndoToast from './UndoToast'

const KIND_LABEL = { diaria: 'diária', semanal: 'semanal', pontual: 'pontual' } as const

/** House chores due today (shared). Ticking hides them; a toast offers undo. */
export default function ChoresToday({ title = '🏠 Casa por fazer' }: { title?: string }) {
  const { uid } = useSession()
  const today = useToday()
  const chores = useCollection<Chore>('chores')
  const [undo, setUndo] = useState<Chore | null>(null)
  const close = useCallback(() => setUndo(null), [])

  const due = chores
    .map(c => ({ c, ...choreDue(c, today) }))
    .filter(x => x.visible)
    .sort((a, b) => Number(b.overdue) - Number(a.overdue) || a.c.title.localeCompare(b.c.title, 'pt-PT'))

  return (
    <div className="card">
      <div className="card-title">{title} <span className="pill">{due.length}</span></div>
      {!due.length && <p className="small muted">Tudo feito ✨</p>}
      {due.map(({ c, overdue }) => (
        <div className="row" key={c.id}>
          <button className="check" aria-label={c.title} onClick={async () => { setUndo(c); markChore(c, today, uid) }} />
          <div className="grow">{c.title}</div>
          <span className={overdue ? 'pill danger' : 'pill'}>{overdue ? 'atrasada' : KIND_LABEL[c.kind]}</span>
        </div>
      ))}
      {undo && <UndoToast message={`«${undo.title}» feita`} onUndo={() => undoChore(undo)} onClose={close} />}
    </div>
  )
}
