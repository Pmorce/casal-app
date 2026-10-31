import { useCallback, useState, type FormEvent } from 'react'
import { useCollection } from '../data/useCollection'
import { useSession } from '../data/session'
import { useToday } from '../hooks/useToday'
import { addChore, deleteChore } from '../data/choresRepo'
import { daysBetween, WEEKDAY_LABELS_PT, type Weekday } from '../domain/dates'
import type { Chore } from '../domain/types'
import ChoresToday from '../components/ChoresToday'
import UndoToast from '../components/UndoToast'
import { restore } from '../data/restore'
import PageHeader from '../components/PageHeader'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'

const KINDS: { value: Chore['kind']; label: string }[] = [
  { value: 'diaria', label: 'Diária' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'pontual', label: 'Pontual' },
]
const WEEK_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0]

function when(key: string, today: string): string {
  const d = daysBetween(key, today)
  return d === 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`
}

export default function Tarefas() {
  const { members } = useSession()
  const today = useToday()
  const chores = useCollection<Chore>('chores')
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<Chore['kind']>('diaria')
  const [weekday, setWeekday] = useState<Weekday>(6)
  const [error, setError] = useState('')
  const [undo, setUndo] = useState<Chore | null>(null)
  const closeUndo = useCallback(() => setUndo(null), [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    try {
      addChore({ title, kind, weekday: kind === 'semanal' ? weekday : undefined }, today)
      setTitle('')
      setError('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const all = [...chores].sort((a, b) => a.title.localeCompare(b.title, 'pt-PT'))

  return (
    <>
      <PageHeader title="Tarefas da casa" back={{ to: '/mais', label: 'Voltar a Mais' }} />
      <div className="lift">
        {/* the card already says «{n} para hoje» */}
        <ChoresToday title="Por fazer" />

        <form className="card" onSubmit={submit}>
          <div className="card-title">+ Tarefa</div>
          <input className="input" placeholder="ex.: Aspirar a sala" value={title} onChange={e => { setTitle(e.target.value); setError('') }} />
          <div className="seg" style={{ marginTop: 8 }}>
            {KINDS.map(k => <button type="button" key={k.value} className={kind === k.value ? 'on' : ''} onClick={() => setKind(k.value)}>{k.label}</button>)}
          </div>
          {kind === 'semanal' && (
            <select className="input" value={weekday} onChange={e => setWeekday(Number(e.target.value) as Weekday)} style={{ marginBottom: 12 }}>
              {WEEK_ORDER.map(d => <option key={d} value={d}>{WEEKDAY_LABELS_PT[d]}</option>)}
            </select>
          )}
          {error && <p className="error">{error}</p>}
          <button className="btn primary block">Adicionar</button>
        </form>

        <div className="card">
          <div className="card-title">Todas</div>
          {!all.length && <p className="small muted">Sem tarefas.</p>}
          {all.map(c => (
            <div className="row" key={c.id}>
              <div className="grow">
                {c.title}
                <div className="note">
                  {c.kind === 'semanal' ? `semanal · ${WEEKDAY_LABELS_PT[c.weekday ?? 0]}` : KINDS.find(k => k.value === c.kind)!.label.toLowerCase()}
                  {c.lastDoneKey && ` · feita por ${members[c.lastDoneBy ?? ''] ?? '?'}, ${when(c.lastDoneKey, today)}`}
                </div>
              </div>
              {c.lastDoneBy && <Avatar uid={c.lastDoneBy} size="sm" decorative />}
              <button className="x-btn" aria-label={`Apagar ${c.title}`} onClick={() => { deleteChore(c.id); setUndo(c) }}><Icon name="x" /></button>
            </div>
          ))}
        </div>
      </div>
      {undo && <UndoToast message={`«${undo.title}» apagada`} onUndo={() => restore('chores', [undo])} onClose={closeUndo} />}
    </>
  )
}
