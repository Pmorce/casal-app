import { HashRouter, Route, Routes } from 'react-router-dom'
import { SessionProvider } from './data/session'
import TabBar from './components/TabBar'
import OfflineBadge from './components/OfflineBadge'
import Hoje from './screens/Hoje'
import Compras from './screens/Compras'
import Congelador from './screens/Congelador'
import Casa from './screens/Casa'
import Mais from './screens/Mais'
import './styles.css'

export default function App() {
  return (
    <SessionProvider>
      <HashRouter>
        <main className="app">
          <OfflineBadge />
          <Routes>
            <Route path="/" element={<Hoje />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/congelador" element={<Congelador />} />
            <Route path="/casa" element={<Casa />} />
            <Route path="/mais/*" element={<Mais />} />
          </Routes>
        </main>
        <TabBar />
      </HashRouter>
    </SessionProvider>
  )
}
