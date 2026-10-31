import { Component, type ReactNode } from 'react'
import PageHeader from './PageHeader'

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
      <>
        <PageHeader title="Algo correu mal" />
        <div className="lift card">
          <p className="small muted" style={{ marginTop: 0 }}>Recarrega a app. Se voltar a acontecer, copia a mensagem abaixo.</p>
          <pre className="error-msg">{error.message}</pre>
          <button className="btn primary block" onClick={() => window.location.reload()}>Recarregar</button>
        </div>
      </>
    )
  }
}
