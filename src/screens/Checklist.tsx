import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useCollection } from '../data/useCollection'
import { useSession } from '../data/session'
import { clearChecklist, deleteChecklist, newId, saveChecklist, toggleChecklistItem } from '../data/routinesRepo'
import type { Checklist as ChecklistT } from '../domain/types'

/** Reusable checklist (e.g. packing a bag): tick while packing, "Limpar" to start over. Owner-only edits. */
export default function Checklist() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { uid, members } = useSession()
  const list = useCollection<ChecklistT>('checklists').find(c => c.id === id)
  const [draft, setDraft] = useState<ChecklistT | null>(null)
  const [newItem, setNewItem] = useState('')

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
        <h1>Editar checklist</h1>
        <label className="field"><span>Nome</span>
          <input className="input" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
        <div className="card">
          {draft.items.map(i => (
            <div className="row" key={i.id}>
              <input className="input grow" value={i.text}
                onChange={e => setDraft({ ...draft, items: draft.items.map(x => (x.id === i.id ? { ...x, text: e.target.value } : x)) })} />
              <button className="link-btn" onClick={() => setDraft({ ...draft, items: draft.items.filter(x => x.id !== i.id) })}>✕</button>
            </div>
          ))}
          <form className="inline" style={{ marginTop: 8 }} onSubmit={e => { e.preventDefault(); add() }}>
            <input className="input" placeholder="Novo item" value={newItem} onChange={e => setNewItem(e.target.value)} />
            <button className="btn">+</button>
          </form>
        </div>
        <button className="btn primary block" onClick={done}>Guardar</button>
        <button className="link-btn" style={{ color: 'var(--danger)' }}
          onClick={async () => { if (confirm('Apagar esta checklist?')) { deleteChecklist(id); navigate('/mais/rotinas') } }}>Apagar checklist</button>
      </>
    )
  }

  return (
    <>
      <Link to="/mais/rotinas" className="link-btn">‹ Rotinas</Link>
      <div className="card-title">
        <h1>{list.name}</h1>
        {mine && <button className="btn small" onClick={() => setDraft(structuredClone(list))}>Editar</button>}
      </div>
      {!mine && <p className="small muted" style={{ marginTop: -8 }}>Checklist de {members[list.ownerUid]} · só leitura</p>}
      <div className="card">
        <div className="card-title"><span /> <span className="pill">{list.checkedIds.length}/{list.items.length}</span></div>
        {list.items.map(i => {
          const on = list.checkedIds.includes(i.id)
          return (
            <div className="row" key={i.id}>
              <button className={on ? 'check on' : 'check'} disabled={!mine} aria-label={i.text}
                onClick={() => toggleChecklistItem(list, i.id, !on)}>{on ? '✓' : ''}</button>
              <div className={on ? 'grow done-text' : 'grow'}>{i.text}</div>
            </div>
          )
        })}
      </div>
      {mine && list.checkedIds.length > 0 && <button className="btn block" onClick={() => clearChecklist(list)}>Limpar</button>}
    </>
  )
}
