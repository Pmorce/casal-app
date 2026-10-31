import { useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useCollection } from '../data/useCollection'
import { useSession } from '../data/session'
import { clearChecklist, deleteChecklist, newId, saveChecklist, toggleChecklistItem } from '../data/routinesRepo'
import type { Checklist as ChecklistT, Routine } from '../domain/types'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'

const BACK = { to: '/mais/rotinas', label: 'Voltar a Rotinas' }
// in edit mode ‹ goes back in history, so a discarded new item's editor is not replayed by Back
const BACK_EDITING = { ...BACK, history: true }

/** Reusable checklist (e.g. packing a bag): tick while packing, "Limpar" to start over. Owner-only edits. */
export default function Checklist() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { uid, members } = useSession()
  const saved = useCollection<ChecklistT>('checklists').find(c => c.id === id)
  const novo = (useLocation().state as { novo?: ChecklistT } | null)?.novo
  const isNew = !saved && novo?.id === id
  const list = saved ?? (isNew ? novo : undefined)
  const myRoutines = useCollection<Routine>('routines', ['ownerUid', '==', uid])
  const [draft, setDraft] = useState<ChecklistT | null>(null)
  const [newItem, setNewItem] = useState('')
  const leave = useUnsavedChanges(draft !== null && (isNew || newItem.trim() !== '' || JSON.stringify(draft) !== JSON.stringify(list)))

  if (!list) return <p className="muted">A carregar…</p>
  const mine = list.ownerUid === uid
  if (mine && !draft && params.get('editar') === '1') setDraft(structuredClone(list))

  if (draft) {
    const add = () => {
      if (!newItem.trim()) return
      setDraft({ ...draft, items: [...draft.items, { id: newId('steps'), text: newItem.trim() }] })
      setNewItem('')
    }
    const done = async () => {
      const ids = new Set(draft.items.map(i => i.id))
      saveChecklist({ ...draft, checkedIds: draft.checkedIds.filter(c => ids.has(c)) })
      setDraft(null)
      navigate(`/mais/checklists/${id}`, { replace: true })
    }
    return (
      <>
        <PageHeader title="Editar checklist" back={BACK_EDITING} />
        <div className="lift">
          <div className="card">
            <label className="field"><span>Nome</span>
              <input className="input" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
            {draft.items.map(i => (
              <div className="row" key={i.id} style={{ paddingLeft: 0 }}>
                <input className="input grow" aria-label={`Item ${i.text}`} value={i.text}
                  onChange={e => setDraft({ ...draft, items: draft.items.map(x => (x.id === i.id ? { ...x, text: e.target.value } : x)) })} />
                <button className="x-btn" aria-label={`Tirar ${i.text}`} onClick={() => setDraft({ ...draft, items: draft.items.filter(x => x.id !== i.id) })}><Icon name="x" /></button>
              </div>
            ))}
            <form className="inline" style={{ marginTop: 8 }} onSubmit={e => { e.preventDefault(); add() }}>
              <input className="input" placeholder="Novo item" value={newItem} onChange={e => setNewItem(e.target.value)} />
              <button className="icon-btn" aria-label="Juntar item"><Icon name="mais1" /></button>
            </form>
          </div>
          <button className="btn primary block" onClick={done}>Guardar</button>
          <div className="inline" style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <button className="link-btn" onClick={() => {
              setDraft(null)
              if (isNew) leave('/mais/rotinas')
              else navigate(`/mais/checklists/${id}`, { replace: true })
            }}>Cancelar</button>
            {!isNew && <button className="link-btn" style={{ color: 'var(--danger)' }}
              onClick={async () => { if (confirm('Apagar esta checklist?')) { deleteChecklist(id, myRoutines); leave('/mais/rotinas') } }}>Apagar checklist</button>}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title={list.name} back={BACK}
        sub={!mine && `Checklist de ${members[list.ownerUid]} · só leitura`}
        right={mine && <button className="btn small" onClick={() => setDraft(structuredClone(list))}>Editar</button>} />
      <div className="lift">
        <div className="card">
          <div className="card-title"><span /> <span className="pill">{list.checkedIds.length}/{list.items.length}</span></div>
          {list.items.map(i => {
            const on = list.checkedIds.includes(i.id)
            return (
              <div className={on ? 'row done' : 'row'} key={i.id}>
                <button className={on ? 'check on' : 'check'} disabled={!mine} aria-label={i.text}
                  onClick={() => toggleChecklistItem(list, i.id, !on)}>{on && <Icon name="check" />}</button>
                <div className={on ? 'grow done-text' : 'grow'}>{i.text}</div>
              </div>
            )
          })}
        </div>
        {mine && list.checkedIds.length > 0 && <button className="btn block" onClick={() => clearChecklist(list)}>Limpar</button>}
      </div>
    </>
  )
}
