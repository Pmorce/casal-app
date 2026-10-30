import { createHashRouter, Outlet, RouterProvider, useLocation } from 'react-router-dom'
import { SessionProvider } from './data/session'
import TabBar from './components/TabBar'
import OfflineBadge from './components/OfflineBadge'
import ErrorBoundary from './components/ErrorBoundary'
import { useTidyUp } from './hooks/useTidyUp'
import Hoje from './screens/Hoje'
import Compras from './screens/Compras'
import Congelador from './screens/Congelador'
import Casa from './screens/Casa'
import Mais from './screens/Mais'
import './styles.css'

/** The screens, guarded: an error shows "Algo correu mal" and switching tab clears it (the tab bar stays outside). */
function Layout() {
  const { pathname } = useLocation()
  useTidyUp()
  return (
    <>
      <main className="app">
        <OfflineBadge />
        <ErrorBoundary resetKey={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <TabBar />
    </>
  )
}

// a data router, so editors can stop the Android Back button from losing unsaved changes (useBlocker)
const router = createHashRouter([{
  element: <Layout />,
  children: [
    { path: '/', element: <Hoje /> },
    { path: '/compras', element: <Compras /> },
    { path: '/congelador', element: <Congelador /> },
    { path: '/casa', element: <Casa /> },
    { path: '/mais/*', element: <Mais /> },
  ],
}])

export default function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  )
}
