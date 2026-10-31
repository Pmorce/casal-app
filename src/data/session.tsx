import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { collection, onSnapshot } from 'firebase/firestore'
import { auth, db } from './firebase'
import Login from '../screens/Login'

export type MemberName = string

export interface Session {
  uid: string
  name: MemberName
  /** uid → name */
  members: Record<string, MemberName>
}

const SessionContext = createContext<Session | null>(null)

export function useSession(): Session {
  const s = useContext(SessionContext)
  if (!s) throw new Error('useSession outside SessionProvider')
  return s
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [members, setMembers] = useState<Record<string, MemberName> | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => onAuthStateChanged(auth, u => {
    setUser(u)
    setMembers(null)
    setDenied(false)
  }), [])

  useEffect(() => {
    if (!user) return
    return onSnapshot(
      collection(db, 'members'),
      snap => {
        const m: Record<string, MemberName> = {}
        snap.forEach(d => { m[d.id] = d.data().name })
        if (m[user.uid]) setMembers(m)
        else if (!snap.metadata.fromCache) setDenied(true)
      },
      () => setDenied(true),
    )
  }, [user])

  if (user === undefined) return <Loading />
  if (!user) return <Login />
  if (denied) {
    return (
      <div className="splash">
        <div className="login card">
          <p>Esta conta não tem acesso.</p>
          <button className="btn" onClick={() => signOut(auth)}>Terminar sessão</button>
        </div>
      </div>
    )
  }
  if (!members) return <Loading />

  return (
    <SessionContext.Provider value={{ uid: user.uid, name: members[user.uid], members }}>
      {children}
    </SessionContext.Provider>
  )
}

/** While the session starts: the login's look, so the first screen does not flash. */
function Loading() {
  return <div className="splash"><p className="splash-name">Casal App</p><p className="splash-sub">A carregar…</p></div>
}
