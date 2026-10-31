import { useCallback, useState } from 'react'
import { useCollection } from '../data/useCollection'
import { useSession } from '../data/session'
import { useToday } from '../hooks/useToday'
import { markChore, undoChore } from '../data/choresRepo'
import { dueChores } from '../domain/chores'
import type { Chore } from '../domain/types'
import { Badge } from './Icon'
import Avatar from './Avatar'
import UndoToast from './UndoToast'

const KIND_LABEL = { diaria: 'diária', semanal: 'semanal', pontual: 'pontual' } as const

/** House chores due today (shared). Ticking hides them; a toast offers undo. The circle is who did it last. */
export default function ChoresToday({ title = 'Tarefas da casa' }: { title?: string }) {
  const { uid, members } = useSession()
  const today = useToday()
  const chores = useCollection<Chore>('chores')
  const [undo, setUndo] = useState<Chore | null>(null)
  const close = useCallback(() => setUndo(null), [])
  const due = dueChores(chores, today)

  return (
    <section className="card">
      <div className="card-head">
        <Badge icon="vassoura" tone="salva" />
        <div className="grow">
          <h2>{title}</h2>
          <div className="meta">{due.length} para hoje</div>
        </div>
      </div>
      {!due.length && <p className="small muted">Tudo feito</p>}
      {due.map(({ c, overdue }) => (
        <div className="row" key={c.id}>
          <button className="check" aria-label={c.title} onClick={async () => { setUndo(c); markChore(c, today, uid) }} />
          <div className="grow">{c.title}</div>
          <span className={overdue ? 'pill danger' : 'pill quiet'}>{overdue ? 'atrasada' : KIND_LABEL[c.kind]}</span>
          {c.lastDoneBy && <Avatar uid={c.lastDoneBy} size="sm" label={`feita por último por ${members[c.lastDoneBy] ?? '?'}`} />}
        </div>
      ))}
      {undo && <UndoToast message={`«${undo.title}» feita`} onUndo={() => undoChore(undo)} onClose={close} />}
    </section>
  )
}
