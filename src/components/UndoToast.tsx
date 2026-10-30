import { useEffect } from 'react'

export interface UndoToastProps {
  message: string
  onUndo: () => void
  onClose: () => void
  /** optional second button, e.g. "Registar gasto" after "Comprei" */
  action?: { label: string; run: () => void }
}

/** Shows for 5 s with a "Desfazer" button (8 s when it also offers an action, to leave time to read it). */
export default function UndoToast({ message, onUndo, onClose, action }: UndoToastProps) {
  const ms = action ? 8000 : 5000
  useEffect(() => {
    const t = setTimeout(onClose, ms)
    return () => clearTimeout(t)
  }, [message, onClose, ms])

  return (
    <div className="toast">
      <span>{message}</span>
      <span>
        {action && <button onClick={() => { action.run(); onClose() }}>{action.label}</button>}
        <button onClick={() => { onUndo(); onClose() }}>Desfazer</button>
      </span>
    </div>
  )
}
