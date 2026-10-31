import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Hoje from './Hoje'
import { bag, prod, routine, step } from '../domain/testFactories'
import type { FreezerBag, Product, Routine, RoutineCheck } from '../domain/types'

const data = vi.hoisted(() => ({ products: [] as Product[], bags: [] as FreezerBag[], routines: [] as Routine[], checks: [] as RoutineCheck[] }))
vi.mock('../data/useCollection', () => ({
  useCollection: (path: string) => ({
    products: data.products, freezerBags: data.bags, routines: data.routines, routineChecks: data.checks,
  } as Record<string, unknown[]>)[path] ?? [],
}))
vi.mock('../data/session', () => ({ useSession: () => ({ uid: 'P', name: 'Ana', members: { P: 'Ana', B: 'Rui' } }) }))
vi.mock('../hooks/useToday', () => ({ useToday: () => '2026-10-29' }))
vi.mock('../components/RoutineToday', () => ({ default: () => null }))
vi.mock('../components/ChoresToday', () => ({ default: () => null }))

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-29T08:00:00Z')) // 08:00 in Lisbon (winter time)
  data.products = []
  data.bags = []
  data.routines = []
  data.checks = []
})
afterEach(() => vi.useRealTimers())

const renderHoje = () => render(<MemoryRouter><Hoje /></MemoryRouter>)

test('greets by the hour in Lisbon', () => {
  renderHoje()
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Bom dia, Ana')
  expect(screen.getByText('Quinta, 29 de outubro')).toBeTruthy()
})

test('with one morning step left, the moment line nudges to close the morning', () => {
  const r = routine({ id: 'r', ownerUid: 'P', steps: [step({ id: 'a' }), step({ id: 'b' }), step({ id: 'c' })] })
  data.routines = [r]
  data.checks = [{ id: 'r_2026-10-29', ownerUid: 'P', routineId: 'r', dateKey: '2026-10-29', doneStepIds: ['a', 'b'] }]
  renderHoje()
  expect(screen.getByText('Falta só um passo para fechares a manhã ✨')).toBeTruthy()
})

test('a Congelador product with bags is not counted as "talvez falte"', () => {
  data.products = [prod({ id: 'v', name: 'Vaca', location: 'congelador', boughtKeys: ['2026-10-20'], freezerLast: { amount: 5, unit: 'kg', key: '2026-10-20' } })]
  data.bags = [bag({ productId: 'v' })]
  renderHoje()
  const tile = screen.getByRole('link', { name: /na lista/ })
  expect(tile.textContent).toMatch(/^0\s*na lista/)
  expect(tile.textContent).not.toMatch(/talvez/)
})
