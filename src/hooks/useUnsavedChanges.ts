import { useEffect } from 'react'

let dirty = false

/** Editors flag unsaved changes; leaving through the tab bar (or closing the app) then asks first. */
export function useUnsavedChanges(isDirty: boolean): void {
  useEffect(() => {
    dirty = isDirty
    if (!isDirty) return
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onUnload)
    return () => {
      dirty = false
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [isDirty])
}

export function confirmLeave(): boolean {
  return !dirty || confirm('Tens alterações por guardar. Sair mesmo assim?')
}
