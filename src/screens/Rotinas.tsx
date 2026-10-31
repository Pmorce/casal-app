import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCollection } from '../data/useCollection'
import { useSession } from '../data/session'
import { newId } from '../data/routinesRepo'
import { todayKey } from '../domain/dates'
import type { Checklist, Routine } from '../domain/types'
import PageHeader from '../components/PageHeader'
import Icon, { Badge } from '../components/Icon'

/** Routines and checklists per person: both visible, only the owner can create/edit. */
export default function Rotinas() {
  const { uid, members } = useSession()
  const navigate = useNavigate()
  const [owner, setOwner] = useState(uid)
  const routines = [...useCollection<Routine>('routines', ['ownerUid', '==', owner])].sort((a, b) => a.order - b.order)
  const checklists = useCollection<Checklist>('checklists', ['ownerUid', '==', owner])
  const mine = owner === uid

  // new ones are only written on "Guardar", so cancelling leaves nothing behind
  async function newRoutine() {
    const id = newId('routines')
    const novo: Routine = { id, ownerUid: uid, name: 'Nova rotina', order: routines.length, steps: [], createdKey: todayKey(new Date()) }
    navigate(`/mais/rotinas/${id}?editar=1`, { state: { novo } })
  }

  async function newChecklist() {
    const id = newId('checklists')
    const novo: Checklist = { id, ownerUid: uid, name: 'Nova checklist', items: [], checkedIds: [] }
    navigate(`/mais/checklists/${id}?editar=1`, { state: { novo } })
  }

  return (
    <>
      <PageHeader title="Rotinas e checklists" back={{ to: '/mais', label: 'Voltar a Mais' }} />
      <div className="lift">
        <div className="seg">
          {Object.entries(members).map(([id, name]) => (
            <button key={id} className={owner === id ? 'on' : ''} onClick={() => setOwner(id)}>{name}</button>
          ))}
        </div>

        <div className="card menu">
          <div className="card-head"><Badge icon="sol" tone="pessego" /><h2>Rotinas</h2></div>
          {routines.map(r => (
            <Link key={r.id} to={`/mais/rotinas/${r.id}`}>
              <span className="grow"><span className="menu-name">{r.name}</span><span className="note">{r.steps.length} passos</span></span>
              <span className="chev"><Icon name="seta" size={18} /></span>
            </Link>
          ))}
          {!routines.length && <p className="small muted">Sem rotinas.</p>}
        </div>
        {mine && <button className="btn dashed block" onClick={newRoutine}>+ Nova rotina</button>}

        <div className="card menu">
          <div className="card-head"><Badge icon="lista" tone="pessego" /><h2>Checklists</h2></div>
          {checklists.map(c => (
            <Link key={c.id} to={`/mais/checklists/${c.id}`}>
              <span className="grow"><span className="menu-name">{c.name}</span><span className="note">{c.checkedIds.length}/{c.items.length}</span></span>
              <span className="chev"><Icon name="seta" size={18} /></span>
            </Link>
          ))}
          {!checklists.length && <p className="small muted">Sem checklists.</p>}
        </div>
        {mine && <button className="btn dashed block" onClick={newChecklist}>+ Nova checklist</button>}
      </div>
    </>
  )
}
