import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCollection } from '../data/useCollection'
import { useSession } from '../data/session'
import { newId, saveChecklist, saveRoutine } from '../data/routinesRepo'
import { todayKey } from '../domain/dates'
import type { Checklist, Routine } from '../domain/types'

/** Routines and checklists per person: both visible, only the owner can create/edit. */
export default function Rotinas() {
  const { uid, members } = useSession()
  const navigate = useNavigate()
  const [owner, setOwner] = useState(uid)
  const routines = [...useCollection<Routine>('routines', ['ownerUid', '==', owner])].sort((a, b) => a.order - b.order)
  const checklists = useCollection<Checklist>('checklists', ['ownerUid', '==', owner])
  const mine = owner === uid

  async function newRoutine() {
    const id = newId('routines')
    saveRoutine({ id, ownerUid: uid, name: 'Nova rotina', order: routines.length, steps: [], createdKey: todayKey(new Date()) })
    navigate(`/mais/rotinas/${id}?editar=1`)
  }

  async function newChecklist() {
    const id = newId('checklists')
    saveChecklist({ id, ownerUid: uid, name: 'Nova checklist', items: [], checkedIds: [] })
    navigate(`/mais/checklists/${id}?editar=1`)
  }

  return (
    <>
      <Link to="/mais" className="link-btn">‹ Mais</Link>
      <h1>Rotinas</h1>
      <div className="seg">
        {Object.entries(members).map(([id, name]) => (
          <button key={id} className={owner === id ? 'on' : ''} onClick={() => setOwner(id)}>{name}</button>
        ))}
      </div>

      <div className="card menu">
        {routines.map(r => (
          <Link key={r.id} to={`/mais/rotinas/${r.id}`}>
            <span className="grow">{r.name}<div className="note">{r.steps.length} passos</div></span>›
          </Link>
        ))}
        {!routines.length && <p className="small muted">Sem rotinas.</p>}
      </div>
      {mine && <button className="btn block" onClick={newRoutine}>+ Nova rotina</button>}

      <h2>Checklists</h2>
      <div className="card menu">
        {checklists.map(c => (
          <Link key={c.id} to={`/mais/checklists/${c.id}`}>
            <span className="grow">{c.name}<div className="note">{c.checkedIds.length}/{c.items.length}</div></span>›
          </Link>
        ))}
        {!checklists.length && <p className="small muted">Sem checklists.</p>}
      </div>
      {mine && <button className="btn block" onClick={newChecklist}>+ Nova checklist</button>}
    </>
  )
}
