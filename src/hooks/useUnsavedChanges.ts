import { useCallback, useEffect, useRef } from 'react'
import { useBlocker, useLocation, useNavigate } from 'react-router-dom'

/**
 * Editors flag unsaved changes; leaving then asks first — through the tab bar, the Android Back button,
 * or closing the app. Save/Cancel-existing navigate with `replace`, which is never blocked.
 * Returns `leave(fallback)` for Apagar / Cancelar-novo: it goes back in history (so the list is not repeated
 * as [Rotinas, Rotinas]) without asking, or replaces with `fallback` when there is nothing behind (deep link).
 */
export function useUnsavedChanges(isDirty: boolean): (fallback: string) => void {
  const navigate = useNavigate()
  const { key } = useLocation()
  const leaving = useRef(false)
  const blocker = useBlocker(({ historyAction }) => isDirty && !leaving.current && historyAction !== 'REPLACE')

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (confirm('Tens alterações por guardar. Sair mesmo assim?')) blocker.proceed()
    else blocker.reset()
  }, [blocker])

  useEffect(() => {
    if (!isDirty) return
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [isDirty])

  return useCallback((fallback: string) => {
    leaving.current = true
    if (key !== 'default') navigate(-1)
    else navigate(fallback, { replace: true })
  }, [navigate, key])
}
