import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import useSidebarStore from '../../store/sidebarStore'

export default function Layout() {
  const isOpen = useSidebarStore(s => s.isOpen)

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-color)' }}>
      <Sidebar />
      <div
        className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300"
        style={{ marginLeft: isOpen ? '240px' : '80px' }}
      >
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
