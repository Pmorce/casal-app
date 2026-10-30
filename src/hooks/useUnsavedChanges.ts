import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'

/**
 * Editors flag unsaved changes; leaving then asks first — through the tab bar, the Android Back button,
 * or closing the app. Save/Cancel/Apagar navigate with `replace`, which is never blocked.
 */
export function useUnsavedChanges(isDirty: boolean): void {
  const blocker = useBlocker(({ historyAction }) => isDirty && historyAction !== 'REPLACE')

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
}
