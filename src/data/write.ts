/**
 * Starts a Firestore write without waiting for it. With the offline cache the change is applied
 * locally (and shown on screen) at once; the promise only settles when the server confirms, which
 * offline may take minutes — so the UI must never await it.
 */
export function fire(write: Promise<unknown>): void {
  write.catch(err => {
    console.error('Falha ao gravar', err)
    window.dispatchEvent(new CustomEvent('casa:write-error'))
  })
}
