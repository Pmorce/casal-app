import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Mais from './Mais'
import { routine } from '../domain/testFactories'
import type { Checklist, Expense, Routine } from '../domain/types'

const data = vi.hoisted(() => ({ expenses: [] as Expense[], routines: [] as Routine[], checklists: [] as Checklist[] }))
vi.mock('../data/useCollection', () => ({
  useCollection: (path: string) => (data as Record<string, unknown[]>)[path] ?? [],
}))
vi.mock('../data/session', () => ({ useSession: () => ({ uid: 'P', name: 'Ana', members: { P: 'Ana', B: 'Rui' } }) }))
vi.mock('../hooks/useToday', () => ({ useToday: () => '2026-10-31' }))
vi.mock('../data/firebase', () => ({ auth: {} }))
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }))
vi.mock('./Rotinas', () => ({ default: () => null }))
vi.mock('./RotinaEditar', () => ({ default: () => null }))
vi.mock('./Checklist', () => ({ default: () => null }))
vi.mock('./Tarefas', () => ({ default: () => null }))
vi.mock('./Gastos', () => ({ default: () => null }))

const spent = (id: string, cents: number, dateKey: string): Expense => ({ id, uid: 'P', cents, dateKey })
const list = (id: string): Checklist => ({ id, ownerUid: 'P', name: id, items: [], checkedIds: [] })

beforeEach(() => {
  data.expenses = []
  data.routines = []
  data.checklists = []
})

const renderMais = () => render(<MemoryRouter><Mais /></MemoryRouter>)

test('the Gastos line adds up this month', () => {
  data.expenses = [spent('a', 1250, '2026-10-02'), spent('b', 300, '2026-10-30'), spent('c', 9900, '2026-09-30')]
  renderMais()
  expect(screen.getByText('este mês: 15,50 €')).toBeTruthy()
})

test('with no expenses this month, the Gastos line says so', () => {
  data.expenses = [spent('c', 9900, '2026-09-30')]
  renderMais()
  expect(screen.getByText('ainda sem gastos este mês')).toBeTruthy()
})

test('the Rotinas line counts routines and checklists', () => {
  data.routines = [routine({ id: 'r1', ownerUid: 'P' }), routine({ id: 'r2', ownerUid: 'P' })]
  data.checklists = [list('c1')]
  renderMais()
  expect(screen.getByText('2 rotinas · 1 checklist')).toBeTruthy()
})

test('the header names both members, in colour order', () => {
  renderMais()
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Mais')
  expect(screen.getByText('Rui e Ana, cá em casa')).toBeTruthy()
  expect(screen.getByRole('button', { name: /Terminar sessão \(Ana\)/ })).toBeTruthy()
})
