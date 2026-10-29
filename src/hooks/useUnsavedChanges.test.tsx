import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import TabBar from '../components/TabBar'
import { useUnsavedChanges } from './useUnsavedChanges'

function Editor({ dirty }: { dirty: boolean }) {
  useUnsavedChanges(dirty)
  return <p>editor</p>
}

const renderAt = (dirty: boolean) => render(
  <MemoryRouter initialEntries={['/mais/rotinas/r1']}>
    <Routes>
      <Route path="/mais/rotinas/r1" element={<Editor dirty={dirty} />} />
      <Route path="/compras" element={<p>compras</p>} />
    </Routes>
    <TabBar />
  </MemoryRouter>,
)

test('leaving an editor with unsaved changes asks first, and staying keeps the edits', () => {
  const ask = vi.spyOn(window, 'confirm').mockReturnValue(false)
  renderAt(true)
  fireEvent.click(screen.getByText('Compras'))
  expect(ask).toHaveBeenCalled()
  expect(screen.getByText('editor')).toBeTruthy()
  ask.mockRestore()
})

test('without changes the tab bar just navigates', () => {
  const ask = vi.spyOn(window, 'confirm')
  renderAt(false)
  fireEvent.click(screen.getByText('Compras'))
  expect(ask).not.toHaveBeenCalled()
  expect(screen.getByText('compras')).toBeTruthy()
  ask.mockRestore()
})
