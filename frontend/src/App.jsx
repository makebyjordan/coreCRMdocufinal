import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Layout from './components/Layout/Layout'
import LoginPage from './pages/Login'
import DashboardPage from './pages/Dashboard'
import ExpedientsPage from './pages/Expedients'
import ExpedientDetailPage from './pages/ExpedientDetail'
import NewExpedientPage from './pages/NewExpedient'
import ClientsPage from './pages/Clients'
import ClientDetailPage from './pages/ClientDetail'
import SettingsPage from './pages/Settings'
import UsersPage from './pages/Users'
import CalendarPage from './pages/Calendar'
import BaseDocumentsPage from './pages/BaseDocuments'
import NotFoundPage from './pages/NotFound'
// FASE 4 - Pendiente: import WorkflowsPage from './pages/Workflows'

function PrivateRoute({ children }) {
  const token = useAuthStore(s => s.token)
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="expedients" element={<ExpedientsPage />} />
        <Route path="expedients/new" element={<NewExpedientPage />} />
        <Route path="expedients/:id" element={<ExpedientDetailPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:id" element={<ClientDetailPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="documents" element={<BaseDocumentsPage />} />
        {/* FASE 4 - Pendiente de activar: Automatizaciones/Workflows. Reactivar cuando estén las tablas workflow_rules en Supabase. */}
        {/* <Route path="workflows" element={<WorkflowsPage />} /> */}
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
