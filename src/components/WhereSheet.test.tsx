import { fireEvent, render, screen } from '@testing-library/react'
import WhereSheet from './WhereSheet'
import { bag } from '../domain/testFactories'

test('asks "Para onde vai?" about the bag and answers with the option picked', () => {
  const onPick = vi.fn()
  render(<WhereSheet bag={bag({ name: 'Vaca', amount: 1, unit: 'kg' })} onPick={onPick} onCancel={vi.fn()} />)
  expect(screen.getByText('Para onde vai?')).toBeTruthy()
  expect(screen.getByText('Vaca 1 kg')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Descongelar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Cozinhar já' }))
  fireEvent.click(screen.getByRole('button', { name: 'Acabou / deitar fora' }))
  expect(onPick.mock.calls).toEqual([['descongelar'], ['cozinhar'], ['acabou']])
})

test('Cancelar only closes', () => {
  const onPick = vi.fn()
  const onCancel = vi.fn()
  render(<WhereSheet bag={bag()} onPick={onPick} onCancel={onCancel} />)
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(onCancel).toHaveBeenCalled()
  expect(onPick).not.toHaveBeenCalled()
})
