import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import RotinaEditar from './RotinaEditar'
import { routine, step } from '../domain/testFactories'
import type { Routine } from '../domain/types'

const data = vi.hoisted(() => ({ routines: [] as Routine[] }))
vi.mock('../data/useCollection', () => ({ useCollection: (path: string) => (path === 'routines' ? data.routines : []) }))
vi.mock('../data/session', () => ({ useSession: () => ({ uid: 'P', name: 'Ana', members: { P: 'Ana', B: 'Rui' } }) }))
vi.mock('../hooks/useToday', () => ({ useToday: () => '2026-10-31' }))
vi.mock('../data/routinesRepo', () => ({ deleteRoutine: vi.fn(), newId: vi.fn(() => 'n1'), saveRoutine: vi.fn() }))

const renderEditing = () => {
  const router = createMemoryRouter([{ path: '/mais/rotinas/:id', element: <RotinaEditar /> }],
    { initialEntries: ['/mais/rotinas/r1?editar=1'] })
  render(<RouterProvider router={router} />)
}

test('Subir and Descer are icon buttons that reorder the steps', () => {
  data.routines = [routine({ id: 'r1', ownerUid: 'P', steps: [step({ text: 'Lavar' }), step({ text: 'Secar' })] })]
  renderEditing()
  const up = screen.getAllByRole('button', { name: 'Subir' })
  expect(up[1].querySelector('svg')).not.toBeNull()
  expect(up[1].textContent).toBe('')
  expect(screen.getAllByRole('button', { name: 'Descer' })[0].querySelector('svg')).not.toBeNull()
  fireEvent.click(up[1])
  expect(screen.getAllByPlaceholderText('Passo').map(i => (i as HTMLInputElement).value)).toEqual(['Secar', 'Lavar'])
})
