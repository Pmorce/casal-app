import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RoutineToday from './RoutineToday'
import { routine, step } from '../domain/testFactories'
import type { Routine, RoutineCheck } from '../domain/types'

const data = vi.hoisted(() => ({ routines: [] as Routine[], checks: [] as RoutineCheck[] }))
vi.mock('../data/useCollection', () => ({
  useCollection: (path: string) => (path === 'routines' ? data.routines : path === 'routineChecks' ? data.checks : []),
}))
vi.mock('../data/session', () => ({ useSession: () => ({ uid: 'P', name: 'Ana', members: { P: 'Ana' } }) }))
vi.mock('../data/routinesRepo', () => ({ toggleStep: vi.fn() }))

test('the checklist link has the arrow icon and a 44px touch area', () => {
  data.routines = [routine({ id: 'r', ownerUid: 'P', steps: [step({ id: 'a', checklistId: 'c1' })] })]
  render(<MemoryRouter><RoutineToday ownerUid="P" day="2026-10-29" /></MemoryRouter>)
  const link = screen.getByRole('link', { name: 'abrir checklist' })
  expect(link.querySelector('svg')).toBeTruthy()
  expect(link.textContent).not.toContain('→')
  expect(link.classList.contains('note-link')).toBe(true)
})

const checkFor = (routineId: string, doneStepIds: string[]): RoutineCheck =>
  ({ id: 'k' + routineId, ownerUid: 'P', routineId, dateKey: '2026-10-29', doneStepIds })
const renderToday = (ownerUid = 'P') => render(<MemoryRouter><RoutineToday ownerUid={ownerUid} day="2026-10-29" /></MemoryRouter>)
const ring = () => document.querySelector('.ring') as HTMLElement

test('with 2 of 3 steps done the card says «2 de 3 feitos» and the ring 67%', () => {
  data.routines = [routine({ id: 'r', ownerUid: 'P', steps: [step({ id: 'a' }), step({ id: 'b' }), step({ id: 'c' })] })]
  data.checks = [checkFor('r', ['a', 'b'])]
  renderToday()
  expect(screen.getByText('2 de 3 feitos')).toBeTruthy()
  expect(ring().textContent).toBe('67%')
})

test('with 0 of 1 steps done the ring says 0%', () => {
  data.routines = [routine({ id: 'r', ownerUid: 'P', steps: [step({ id: 'a' })] })]
  data.checks = []
  renderToday()
  expect(screen.getByText('0 de 1 feitos')).toBeTruthy()
  expect(ring().textContent).toBe('0%')
})

test('with every step done the ring shows the check icon instead of 100%', () => {
  data.routines = [routine({ id: 'r', ownerUid: 'P', steps: [step({ id: 'a' }), step({ id: 'b' })] })]
  data.checks = [checkFor('r', ['a', 'b'])]
  renderToday()
  expect(ring().textContent).toBe('')
  expect(ring().querySelector('svg')).toBeTruthy()
})

test('another person routine renders its checks disabled; mine are enabled', () => {
  data.routines = [routine({ id: 'r', ownerUid: 'B', steps: [step({ id: 'a', text: 'Lavar' })] })]
  data.checks = []
  renderToday('B')
  expect((screen.getByRole('button', { name: 'Lavar' }) as HTMLButtonElement).disabled).toBe(true)
  cleanup()
  data.routines = [routine({ id: 'r', ownerUid: 'P', steps: [step({ id: 'a', text: 'Lavar' })] })]
  renderToday('P')
  expect((screen.getByRole('button', { name: 'Lavar' }) as HTMLButtonElement).disabled).toBe(false)
})
