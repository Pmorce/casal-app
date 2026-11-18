import { fireEvent, render, screen } from '@testing-library/react'
import StorePicker from './StorePicker'

const setup = (allowNone?: boolean) => {
  const onPick = vi.fn(), onAddCustom = vi.fn()
  render(<StorePicker title="Onde foi?" options={['Lidl', 'Continente']} onPick={onPick} onAddCustom={onAddCustom} allowNone={allowNone} />)
  return { onPick, onAddCustom }
}

test('"Não digo" only appears with allowNone', () => {
  const { unmount } = render(<StorePicker title="Onde foi?" options={['Lidl']} onPick={vi.fn()} onAddCustom={vi.fn()} />)
  expect(screen.queryByRole('button', { name: 'Não digo' })).toBeNull()
  unmount()
  setup(true)
  expect(screen.getByRole('button', { name: 'Não digo' })).toBeTruthy()
})

test('tapping a store picks it; "Não digo" picks null', () => {
  const { onPick } = setup(true)
  fireEvent.click(screen.getByRole('button', { name: 'Lidl' }))
  expect(onPick).toHaveBeenLastCalledWith('Lidl')
  fireEvent.click(screen.getByRole('button', { name: 'Não digo' }))
  expect(onPick).toHaveBeenLastCalledWith(null)
})

test('"+ outra" takes a name, saves it as a custom store and picks it', () => {
  const { onPick, onAddCustom } = setup()
  fireEvent.click(screen.getByRole('button', { name: '+ outra' }))
  fireEvent.change(screen.getByPlaceholderText('Nome da loja'), { target: { value: 'Talho Zé' } })
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
  expect(onAddCustom).toHaveBeenCalledWith('Talho Zé')
  expect(onPick).toHaveBeenCalledWith('Talho Zé')
})
