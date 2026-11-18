import { fireEvent, render, screen } from '@testing-library/react'
import QtyPrompt from './QtyPrompt'

test('"Quantos há?" saves a whole number, 0 included', () => {
  const onSave = vi.fn()
  render(<QtyPrompt title="Quantos há?" name="Iogurtes" min={0} onSave={onSave} onCancel={() => {}} />)
  fireEvent.change(screen.getByLabelText('Quantos há?'), { target: { value: '0' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(onSave).toHaveBeenCalledWith(0)
})

test('starts from the current number', () => {
  render(<QtyPrompt title="Quantos há?" name="Iogurtes" min={0} initial={3} onSave={() => {}} onCancel={() => {}} />)
  expect((screen.getByLabelText('Quantos há?') as HTMLInputElement).value).toBe('3')
})

test.each(['', '1,5', '1.5', '-2', 'abc', '1e2'])('"%s" is not saved', value => {
  const onSave = vi.fn()
  render(<QtyPrompt title="Quantos há?" name="Iogurtes" min={0} onSave={onSave} onCancel={() => {}} />)
  fireEvent.change(screen.getByLabelText('Quantos há?'), { target: { value } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(onSave).not.toHaveBeenCalled()
  expect(screen.getByText(/número inteiro/)).toBeTruthy()
})

test('"Quantos compraste?" needs more than 0', () => {
  const onSave = vi.fn()
  render(<QtyPrompt title="Quantos compraste?" name="Kefir" min={1} onSave={onSave} onCancel={() => {}} />)
  fireEvent.change(screen.getByLabelText('Quantos compraste?'), { target: { value: '0' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(onSave).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('Quantos compraste?'), { target: { value: ' 4 ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  expect(onSave).toHaveBeenCalledWith(4)
})

test('Cancelar closes without saving', () => {
  const onSave = vi.fn()
  const onCancel = vi.fn()
  render(<QtyPrompt title="Quantos há?" name="Iogurtes" min={0} onSave={onSave} onCancel={onCancel} />)
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(onCancel).toHaveBeenCalled()
  expect(onSave).not.toHaveBeenCalled()
})
