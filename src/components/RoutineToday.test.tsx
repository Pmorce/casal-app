import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RoutineToday from './RoutineToday'
import { routine, step } from '../domain/testFactories'
import type { Routine } from '../domain/types'

const data = vi.hoisted(() => ({ routines: [] as Routine[] }))
vi.mock('../data/useCollection', () => ({
  useCollection: (path: string) => (path === 'routines' ? data.routines : []),
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
