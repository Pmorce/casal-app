import { useEffect, useState } from 'react'
import { useOnline } from '../hooks/useOnline'

/** Offline notice, plus a short warning when a background save is rejected (see data/write.ts). */
export default function OfflineBadge() {
  const online = useOnline()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const onError = () => {
      setFailed(true)
      clearTimeout(t)
      t = setTimeout(() => setFailed(false), 6000)
    }
    window.addEventListener('casa:write-error', onError)
    return () => {
      clearTimeout(t)
      window.removeEventListener('casa:write-error', onError)
    }
  }, [])

  if (failed) return <div className="offline">não foi possível gravar a última alteração — tenta outra vez</div>
  return online ? null : <div className="offline">sem ligação · as alterações sincronizam depois</div>
}
