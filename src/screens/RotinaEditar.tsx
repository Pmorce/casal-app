import { useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { stepsWithoutDays } from '../domain/routines'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { useCollection } from '../data/useCollection'
import { useSession } from '../data/session'
import { useToday } from '../hooks/useToday'
import { deleteRoutine, newId, saveRoutine } from '../data/routinesRepo'
import MonthCalendar from '../components/MonthCalendar'
import PageHeader from '../components/PageHeader'
import Icon, { Badge } from '../components/Icon'
import type { Checklist, Routine, RoutineCheck, Step } from '../domain/types'
import type { Weekday } from '../domain/dates'

const DAY_CHIPS: { d: Weekday; l: string }[] = [
  { d: 1, l: 'S' }, { d: 2, l: 'T' }, { d: 3, l: 'Q' }, { d: 4, l: 'Q' }, { d: 5, l: 'S' }, { d: 6, l: 'S' }, { d: 0, l: 'D' },
]
const DAY_NAMES = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6]
const BACK = { to: '/mais/rotinas', label: 'Voltar a Rotinas' }

const daysLabel = (days: Weekday[]) =>
  days.length === 7 ? 'todos os dias' : [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => DAY_NAMES[d]).join(', ')

export default function RotinaEditar() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { uid, members } = useSession()
  const today = useToday()
  const saved = useCollection<Routine>('routines').find(r => r.id === id)
  const novo = (useLocation().state as { novo?: Routine } | null)?.novo
  const isNew = !saved && novo?.id === id
  const routine = saved ?? (isNew ? novo : undefined)
  const checks = useCollection<RoutineCheck>('routineChecks', ['routineId', '==', id])
  const checklists = useChecklistsOf(routine?.ownerUid ?? '')
  const [draft, setDraft] = useState<Routine | null>(null)
  const [error, setError] = useState('')
  const editing = draft !== null
  const leave = useUnsavedChanges(draft !== null && (isNew || JSON.stringify(draft) !== JSON.stringify(routine)))

  if (!routine) return <p className="muted">A carregar…</p>
  const mine = routine.ownerUid === uid

  if (mine && !editing && params.get('editar') === '1') setDraft(structuredClone(routine))

  if (editing && draft) {
    const set = (patch: Partial<Routine>) => setDraft({ ...draft, ...patch })
    const setStep = (i: number, patch: Partial<Step>) => set({ steps: draft.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) })
    const move = (i: number, d: number) => {
      const steps = [...draft.steps]
      const j = i + d
      if (j < 0 || j >= steps.length) return
      ;[steps[i], steps[j]] = [steps[j], steps[i]]
      set({ steps })
    }
    const save = async () => {
      const noDays = stepsWithoutDays(draft.steps)
      if (noDays.length) return setError(`Escolhe pelo menos um dia para: ${noDays.join(', ')}`)
      saveRoutine({ ...draft, steps: draft.steps.filter(s => s.text.trim()) })
      setDraft(null)
      navigate(`/mais/rotinas/${id}`, { replace: true })
    }

    return (
      <>
        <PageHeader title="Editar rotina" back={BACK} />
        <div className="lift">
          <div className="card">
            <label className="field"><span>Nome</span>
              <input className="input" value={draft.name} onChange={e => set({ name: e.target.value })} /></label>
            <label className="field" style={{ marginBottom: 0 }}><span>Nota geral (opcional)</span>
              <input className="input" value={draft.note ?? ''} onChange={e => set({ note: e.target.value || undefined })} /></label>
          </div>

          {draft.steps.map((s, i) => (
            <div className="card" key={s.id}>
              <div className="inline" style={{ marginBottom: 8 }}>
                <input className="input" placeholder="Passo" value={s.text} onChange={e => setStep(i, { text: e.target.value })} />
                <button className="icon-btn" onClick={() => move(i, -1)} aria-label="Subir">↑</button>
                <button className="icon-btn" onClick={() => move(i, 1)} aria-label="Descer">↓</button>
              </div>
              <input className="input" placeholder="Nota (opcional)" value={s.note ?? ''} onChange={e => setStep(i, { note: e.target.value || undefined })} />
              <div className="seg" style={{ marginTop: 8 }}>
                <button className={s.period === 'manha' ? 'on' : ''} onClick={() => setStep(i, { period: 'manha' })}><Icon name="sol" size={18} />Manhã</button>
                <button className={s.period === 'noite' ? 'on' : ''} onClick={() => setStep(i, { period: 'noite' })}><Icon name="lua" size={18} />Noite</button>
              </div>
              <div className="chips">
                {DAY_CHIPS.map(c => (
                  <button key={c.d} className={s.days.includes(c.d) ? 'on' : ''}
                    onClick={() => setStep(i, { days: s.days.includes(c.d) ? s.days.filter(x => x !== c.d) : [...s.days, c.d] })}>{c.l}</button>
                ))}
                <button onClick={() => setStep(i, { days: ALL_DAYS })}>Todos</button>
              </div>
              {checklists.length > 0 && (
                <select className="input" style={{ marginTop: 8 }} value={s.checklistId ?? ''} onChange={e => setStep(i, { checklistId: e.target.value || undefined })}>
                  <option value="">Sem checklist</option>
                  {checklists.map(c => <option key={c.id} value={c.id}>Abre: {c.name}</option>)}
                </select>
              )}
              <button className="link-btn" onClick={() => set({ steps: draft.steps.filter((_, j) => j !== i) })}>Apagar passo</button>
            </div>
          ))}
          <button className="btn dashed block"
            onClick={() => set({ steps: [...draft.steps, { id: newId('steps'), text: '', period: 'manha', days: ALL_DAYS }] })}>+ Passo</button>
          {error && <p className="error">{error}</p>}
          <button className="btn primary block" onClick={save}>Guardar</button>
          <div className="inline" style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <button className="link-btn" onClick={() => {
              setDraft(null)
              if (isNew) leave('/mais/rotinas')
              else navigate(`/mais/rotinas/${id}`, { replace: true })
            }}>Cancelar</button>
            {!isNew && <button className="link-btn" style={{ color: 'var(--danger)' }}
              onClick={async () => { if (confirm('Apagar esta rotina?')) { deleteRoutine(id); leave('/mais/rotinas') } }}>Apagar rotina</button>}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title={routine.name} back={BACK}
        sub={!mine && `Rotina de ${members[routine.ownerUid]} · só leitura`}
        right={mine && <button className="btn small" onClick={() => setDraft(structuredClone(routine))}>Editar</button>} />
      <div className="lift">
        {routine.note && <p className="card small">{routine.note}</p>}
        <MonthCalendar routine={routine} checks={checks} today={today} />
        {(['manha', 'noite'] as const).map(p => {
          const steps = routine.steps.filter(s => s.period === p)
          if (!steps.length) return null
          return (
            <div className="card" key={p}>
              <div className="card-head">
                <Badge icon={p === 'manha' ? 'sol' : 'lua'} tone="pessego" />
                <h2>{p === 'manha' ? 'Manhã' : 'Noite'}</h2>
              </div>
              {steps.map(s => (
                <div className="row" key={s.id}>
                  <div className="grow">
                    {s.text}
                    {s.note && <div className="note">{s.note}</div>}
                    <div className="note">{daysLabel(s.days)}</div>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </>
  )
}

function useChecklistsOf(ownerUid: string): Checklist[] {
  return useCollection<Checklist>('checklists', ['ownerUid', '==', ownerUid])
}
