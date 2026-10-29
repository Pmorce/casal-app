import { useEffect } from 'react'

export interface UndoToastProps {
  message: string
  onUndo: () => void
  onClose: () => void
}

/** Shows for 5 s with a "Desfazer" button. */
export default function UndoToast({ message, onUndo, onClose }: UndoToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [message, onClose])

  return (
    <div className="toast">
      <span>{message}</span>
      <button onClick={() => { onUndo(); onClose() }}>Desfazer</button>
    </div>
  )
}
