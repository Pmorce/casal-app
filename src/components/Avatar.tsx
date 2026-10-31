import { useSession } from '../data/session'
import { memberColor } from '../domain/look'

/** A member's initial in their colour (pink or sky blue); an unknown uid gets a neutral «?». */
export default function Avatar({ uid, size = 'md' }: { uid: string; size?: 'sm' | 'md' }) {
  const { members } = useSession()
  const { bg, ink, initial } = memberColor(uid, members)
  return (
    <span className={`avatar ${size}`} style={{ background: bg, color: ink }} role="img" aria-label={members[uid] ?? 'Desconhecido'}>
      {initial}
    </span>
  )
}

/** Both members, overlapped, in the colour order. */
export function Couple() {
  const { members } = useSession()
  return (
    <span className="couple">
      {Object.keys(members).sort().map(uid => <Avatar key={uid} uid={uid} />)}
    </span>
  )
}
