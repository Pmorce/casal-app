import { Link, Route, Routes } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../data/firebase'
import { useSession } from '../data/session'
import { useCollection } from '../data/useCollection'
import { useToday } from '../hooks/useToday'
import { formatEuros, monthTotals } from '../domain/expenses'
import { routinesLine } from '../domain/look'
import type { Checklist as ChecklistT, Expense, Routine } from '../domain/types'
import PageHeader from '../components/PageHeader'
import Icon, { Badge } from '../components/Icon'
import { Couple } from '../components/Avatar'
import Rotinas from './Rotinas'
import RotinaEditar from './RotinaEditar'
import Checklist from './Checklist'
import Tarefas from './Tarefas'
import Gastos from './Gastos'

function Menu() {
  const { uid, name, members } = useSession()
  const today = useToday()
  const routines = useCollection<Routine>('routines', ['ownerUid', '==', uid])
  const checklists = useCollection<ChecklistT>('checklists', ['ownerUid', '==', uid])
  const expenses = useCollection<Expense>('expenses')
  const { total } = monthTotals(expenses, Number(today.slice(0, 4)), Number(today.slice(5, 7)))
  // the same order as the colours (memberColor); no articles: they depend on the names
  const names = Object.keys(members).sort().map(id => members[id])

  return (
    <>
      <PageHeader title="Mais" sub={`${names.join(' e ')}, cá em casa`} right={<Couple />} />
      <div className="lift">
        <div className="card menu">
          <Link to="/mais/tarefas">
            <Badge icon="vassoura" tone="salva" />
            <span className="grow"><span className="menu-name">Tarefas da casa</span><span className="note">quem faz o quê, e quando</span></span>
            <span className="chev"><Icon name="seta" size={18} /></span>
          </Link>
          <Link to="/mais/rotinas">
            <Badge icon="lista" tone="pessego" />
            <span className="grow"><span className="menu-name">Rotinas e checklists</span><span className="note">{routinesLine(routines.length, checklists.length)}</span></span>
            <span className="chev"><Icon name="seta" size={18} /></span>
          </Link>
          <Link to="/mais/gastos">
            <Badge icon="euro" tone="rosa" />
            <span className="grow">
              <span className="menu-name">Gastos do supermercado</span>
              <span className="note">{total ? `este mês: ${formatEuros(total)}` : 'ainda sem gastos este mês'}</span>
            </span>
            <span className="chev"><Icon name="seta" size={18} /></span>
          </Link>
        </div>
        <button className="quiet-line" onClick={() => signOut(auth)}><Icon name="sair" size={16} />Terminar sessão ({name})</button>
      </div>
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
