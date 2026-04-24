import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  CheckCircle, Clock, AlertCircle, ArrowRight,
  Calendar, User, Briefcase
} from 'lucide-react'
import api from '../../api/client'

const PRIORITY_COLORS = {
  HIGH: 'text-red-600 bg-red-500/10 border-red-200',
  MEDIUM: 'text-yellow-600 bg-yellow-500/10 border-yellow-200',
  LOW: 'text-green-600 bg-green-500/10 border-green-200',
}

const TYPE_ICONS = {
  LLAMAR: PhoneIcon,
  EMAIL: MailIcon,
  VISITA: VisitIcon,
  REVISAR_DOC: DocIcon,
  FIRMAR: SignIcon,
  OTRA: TaskIcon,
}

function PhoneIcon() { return <span>📞</span> }
function MailIcon() { return <span>📧</span> }
function VisitIcon() { return <span>🏢</span> }
function DocIcon() { return <span>📄</span> }
function SignIcon() { return <span>✍️</span> }
function TaskIcon() { return <span>📝</span> }

export default function TasksWidget() {
  const { data: tasks } = useQuery({
    queryKey: ['tasks-widget'],
    queryFn: () => api.get('/tasks?completed=false&limit=10&mine=true').then(r => r.data.data),
    refetchInterval: 60_000,
  })

  const overdueTasks = tasks?.filter(t => 
    t.dueDate && new Date(t.dueDate) < new Date() && !t.completedAt
  ) || []

  const todayTasks = tasks?.filter(t => {
    if (!t.dueDate || t.completedAt) return false
    const due = new Date(t.dueDate)
    const today = new Date()
    return due.toDateString() === today.toDateString()
  }) || []

  const upcomingTasks = tasks?.filter(t => {
    if (!t.dueDate || t.completedAt) return false
    const due = new Date(t.dueDate)
    const today = new Date()
    return due > today
  }) || []

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[var(--text-main)] flex items-center gap-2">
          <Calendar size={18} className="text-[var(--primary-color)]" />
          Mis tareas
        </h3>
        <Link
          to="/tasks"
          className="text-xs text-[var(--primary-color)] hover:underline flex items-center gap-1"
        >
          Ver todas <ArrowRight size={12} />
        </Link>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-2 rounded-lg bg-red-500/10 text-center">
          <p className="text-lg font-bold text-red-600">{overdueTasks.length}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Vencidas</p>
        </div>
        <div className="p-2 rounded-lg bg-blue-500/10 text-center">
          <p className="text-lg font-bold text-blue-600">{todayTasks.length}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Hoy</p>
        </div>
        <div className="p-2 rounded-lg bg-[var(--sidebar-bg)] text-center">
          <p className="text-lg font-bold text-[var(--text-main)]">{upcomingTasks.length}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Próximas</p>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-2 max-h-64 overflow-auto">
        {overdueTasks.slice(0, 3).map(task => (
          <TaskItem key={task.id} task={task} isOverdue />
        ))}
        {todayTasks.slice(0, 3).map(task => (
          <TaskItem key={task.id} task={task} isToday />
        ))}
        {upcomingTasks.slice(0, 3).map(task => (
          <TaskItem key={task.id} task={task} />
        ))}

        {tasks?.length === 0 && (
          <div className="text-center py-4 text-gray-400 text-sm">
            Sin tareas pendientes
          </div>
        )}
      </div>
    </div>
  )
}

function TaskItem({ task, isOverdue, isToday }) {
  const Icon = TYPE_ICONS[task.type] || TaskIcon

  return (
    <Link
      to={task.clientId ? `/clients/${task.clientId}` : task.expedientId ? `/expedients/${task.expedientId}` : '#'}
      className={`block p-2 rounded-lg border transition-colors ${
        isOverdue ? 'border-red-200 bg-red-500/5' : 
        isToday ? 'border-blue-200 bg-blue-500/5' : 
        'border-[var(--border-color)] hover:bg-[var(--sidebar-bg)]'
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5">
          <Icon />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-main)] truncate">{task.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`badge text-[10px] ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.MEDIUM}`}>
              {task.priority}
            </span>
            {task.dueDate && (
              <span className={`text-[10px] flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-[var(--text-muted)]'}`}>
                <Clock size={10} />
                {new Date(task.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
          {task.client && (
            <p className="text-[10px] text-[var(--text-muted)] mt-1 flex items-center gap-1">
              <User size={10} />
              {task.client.firstName || task.client.companyName}
            </p>
          )}
          {task.expedient && (
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
              <Briefcase size={10} />
              {task.expedient.code}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
