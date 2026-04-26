import { Link } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  const token = useAuthStore(s => s.token)
  const destino = token ? '/dashboard' : '/login'

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-color)] p-6">
      <div className="text-center max-w-md">
        <p className="text-7xl font-bold text-[var(--primary-color)]">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-[var(--text-color)]">
          Página no encontrada
        </h1>
        <p className="mt-2 text-[var(--text-muted)]">
          La ruta a la que intentas acceder no existe.
        </p>
        <Link
          to={destino}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary-color)] text-white font-medium hover:opacity-90 transition"
        >
          <ArrowLeft size={16} />
          Volver al {token ? 'dashboard' : 'login'}
        </Link>
      </div>
    </div>
  )
}
