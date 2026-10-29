import { Link, Route, Routes } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../data/firebase'
import { useSession } from '../data/session'
import Rotinas from './Rotinas'
import RotinaEditar from './RotinaEditar'
import Checklist from './Checklist'
import Tarefas from './Tarefas'
import Gastos from './Gastos'

function Menu() {
  const { name } = useSession()
  return (
    <>
      <h1>Mais</h1>
      <div className="card menu">
        <Link to="/mais/tarefas"><span>🧹</span><span className="grow">Tarefas da casa</span>›</Link>
        <Link to="/mais/rotinas"><span>✨</span><span className="grow">Rotinas e checklists</span>›</Link>
        <Link to="/mais/gastos"><span>💶</span><span className="grow">Gastos do supermercado</span>›</Link>
      </div>
      <button className="btn block" onClick={() => signOut(auth)}>Terminar sessão ({name})</button>
    </>
  )
}

export default function Mais() {
  return (
    <Routes>
      <Route index element={<Menu />} />
      <Route path="tarefas" element={<Tarefas />} />
      <Route path="rotinas" element={<Rotinas />} />
      <Route path="rotinas/:id" element={<RotinaEditar />} />
      <Route path="checklists/:id" element={<Checklist />} />
      <Route path="gastos" element={<Gastos />} />
    </Routes>
  )
}
