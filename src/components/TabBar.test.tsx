import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TabBar from './TabBar'

test('the tab bar keeps its five names and shows no emoji', () => {
  render(<MemoryRouter><TabBar /></MemoryRouter>)
  for (const label of ['Hoje', 'Compras', 'Congelador', 'Casa', 'Mais']) {
    expect(screen.getByRole('link', { name: label })).toBeTruthy()
  }
  expect(screen.getByRole('navigation').textContent).not.toMatch(/\p{Extended_Pictographic}/u)
})
