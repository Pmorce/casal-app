import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Compras from './Compras'
import { item } from '../domain/testFactories'
import type { ShoppingItem } from '../domain/types'

const data = vi.hoisted(() => ({ shopping: [] as ShoppingItem[] }))
vi.mock('../data/useCollection', () => ({
  useCollection: (path: string) => (path === 'shopping' ? data.shopping : []),
}))
vi.mock('../data/session', () => ({ useSession: () => ({ uid: 'P', name: 'Ana', members: { P: 'Ana', B: 'Rui' } }) }))
vi.mock('../data/shoppingRepo', () => ({ addItem: vi.fn(), toggleCart: vi.fn(), finish: vi.fn(), deleteItem: vi.fn() }))

const renderIt = () => render(<MemoryRouter><Compras /></MemoryRouter>)

test('"Terminar compras" only appears with something in the cart', () => {
  data.shopping = [item({ text: 'Café', status: 'porComprar' })]
  const { unmount } = renderIt()
  expect(screen.queryByRole('button', { name: /Terminar compras/ })).toBeNull()
  unmount()

  data.shopping = [item({ text: 'Café', status: 'carrinho' })]
  renderIt()
  expect(screen.getByRole('button', { name: /Terminar compras/ })).toBeTruthy()
})

test('shows who added each item and the shortage reason', () => {
  data.shopping = [item({ text: 'Natas', addedBy: 'B', reason: 'acabou' })]
  renderIt()
  expect(screen.getByText('Rui')).toBeTruthy()
  expect(screen.getByText('acabou')).toBeTruthy()
})
