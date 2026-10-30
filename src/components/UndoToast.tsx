import { useEffect } from 'react'

export interface UndoToastProps {
  message: string
  onUndo: () => void
  onClose: () => void
  /** optional second button, e.g. "Registar gasto" after "Comprei" */
  action?: { label: string; run: () => void }
  /** the ✕ of an offer as an answer, e.g. "no" to "Pôr na lista" */
  onDismiss?: () => void
}

/**
 * Shows for 5 s with a "Desfazer" button. When it offers an action it is a question, so it stays
 * (highlighted) until answered or dismissed — a 5 s toast was easy to miss.
 */
export default function UndoToast({ message, onUndo, onClose, action, onDismiss }: UndoToastProps) {
  useEffect(() => {
    if (action) return
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [message, onClose, action])

  if (action) {
    return (
      <div className="toast offer">
        <span>{message}</span>
        <span className="toast-actions">
          <button className="toast-main" onClick={() => { action.run(); onClose() }}>{action.label}</button>
          <button onClick={() => { onUndo(); onClose() }}>Desfazer</button>
          <button aria-label="Fechar" onClick={() => { onDismiss?.(); onClose() }}>✕</button>
        </span>
      </div>
    )
  }

  return (
    <div className="toast">
      <span>{message}</span>
      <button onClick={() => { onUndo(); onClose() }}>Desfazer</button>
    </div>
  )
}
