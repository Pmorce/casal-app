import { render } from '@testing-library/react'
import * as fs from 'firebase/firestore'
import { act } from 'react'
import { useCollection } from './useCollection'

vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => name,
  query: (ref: string) => ref,
  where: () => null,
  onSnapshot: vi.fn(),
}))
vi.mock('./firebase', () => ({ db: {} }))

type Cb = (snap: unknown) => void
let next: Cb
const snap = (docs: { id: string; text: string }[]) => ({ docs: docs.map(({ id, ...data }) => ({ id, data: () => data })) })

function Probe({ seen }: { seen: string[][] }) {
  const docs = useCollection<{ id: string; text: string }>('shopping')
  seen.push(docs.map(d => d.text))
  return null
}

beforeEach(() => {
  vi.mocked(fs.onSnapshot).mockImplementation(((_ref: string, cb: Cb) => { next = cb; return () => {} }) as never)
})

test('a screen opened again starts from the last known docs, not empty (no flash of the empty state)', () => {
  const first: string[][] = []
  const a = render(<Probe seen={first} />)
  act(() => next(snap([{ id: '1', text: 'Leite' }])))
  a.unmount()

  const second: string[][] = []
  render(<Probe seen={second} />)
  expect(second[0]).toEqual(['Leite'])
})

test('the first ever render of a collection is still empty until the snapshot arrives', () => {
  const seen: string[][] = []
  function Other() {
    seen.push(useCollection<{ id: string; text: string }>('nunca-vista').map(d => d.text))
    return null
  }
  render(<Other />)
  expect(seen[0]).toEqual([])
})
