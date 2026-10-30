import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { SessionProvider } from './data/session'
import TabBar from './components/TabBar'
import OfflineBadge from './components/OfflineBadge'
import ErrorBoundary from './components/ErrorBoundary'
import Hoje from './screens/Hoje'
import Compras from './screens/Compras'
import Congelador from './screens/Congelador'
import Casa from './screens/Casa'
import Mais from './screens/Mais'
import './styles.css'

/** The screens, guarded: an error shows "Algo correu mal" and switching tab clears it (the tab bar stays outside). */
function AppRoutes() {
  const { pathname } = useLocation()
  return (
    <ErrorBoundary resetKey={pathname}>
      <Routes>
        <Route path="/" element={<Hoje />} />
        <Route path="/compras" element={<Compras />} />
        <Route path="/congelador" element={<Congelador />} />
        <Route path="/casa" element={<Casa />} />
        <Route path="/mais/*" element={<Mais />} />
      </Routes>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <SessionProvider>
      <HashRouter>
        <main className="app">
          <OfflineBadge />
          <AppRoutes />
        </main>
        <TabBar />
      </HashRouter>
    </SessionProvider>
  )
}
