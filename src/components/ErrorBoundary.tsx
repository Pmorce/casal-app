import { Component, type ReactNode } from 'react'

interface Props {
  /** changing it (e.g. switching tab) clears the error */
  resetKey: string
  children: ReactNode
}

/** Instead of a black screen: what went wrong (selectable, to copy) and a way out. */
export default class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="card">
        <h1>Algo correu mal</h1>
        <p className="small muted">Recarrega a app. Se voltar a acontecer, copia a mensagem abaixo.</p>
        <pre className="small" style={{ whiteSpace: 'pre-wrap', userSelect: 'text' }}>{error.message}</pre>
        <button className="btn primary block" onClick={() => window.location.reload()}>Recarregar</button>
      </div>
    )
  }
}
