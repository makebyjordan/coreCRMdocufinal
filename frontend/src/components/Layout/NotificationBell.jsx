import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell, AlertTriangle, CheckCircle, Clock, X, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../api/client'
import useAuthStore from '../../store/authStore'

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef(null)
  const user = useAuthStore(s => s.user)

  // Fetch notifications
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => {
      const data = r.data;
      return Array.isArray(data) ? data : [];
    }),
    refetchInterval: 30_000,
  })
  
  const notifications = Array.isArray(data) ? data : []

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = (notifications || []).filter(n => !n.read).length

  function handleMarkAsRead(notificationId) {
    api.post(`/notifications/${notificationId}/read`)
    refetch()
  }

  function handleMarkAllAsRead() {
    api.post('/notifications/mark-all-read')
    refetch()
  }

  function handleClear(notificationId) {
    api.delete(`/notifications/${notificationId}`)
    refetch()
  }

  function getNotificationIcon(type) {
    switch (type) {
      case 'BLOCKED_EXPEDIENT':
        return AlertTriangle
      case 'PENDING_SIGNATURE':
        return Clock
      case 'EXPEDIENT_COMPLETED':
        return CheckCircle
      default:
        return Bell
    }
  }

  function getNotificationColor(type) {
    switch (type) {
      case 'BLOCKED_EXPEDIENT':
        return '#ef4444'
      case 'PENDING_SIGNATURE':
        return '#f59e0b'
      case 'EXPEDIENT_COMPLETED':
        return '#10b981'
      default:
        return '#3b82f6'
    }
  }

  function getNotificationTitle(type) {
    switch (type) {
      case 'BLOCKED_EXPEDIENT':
        return 'Expediente bloqueado'
      case 'PENDING_SIGNATURE':
        return 'Firma pendiente'
      case 'EXPEDIENT_COMPLETED':
        return 'Expediente completado'
      case 'TEAM_MESSAGE':
        return 'Nuevo mensaje'
      case 'PHASE_CHANGE':
        return 'Cambio de fase'
      default:
        return 'Notificación'
    }
  }

  return (
    <div ref={panelRef} className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-xl hover:bg-[var(--sidebar-hover)] transition-all border border-transparent hover:border-[var(--border-color)] relative"
        style={{ color: 'var(--text-muted)' }}
        title="Notificaciones"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span
            className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full text-white text-xs font-bold flex items-center justify-center"
            style={{ backgroundColor: '#ef4444' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-96 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col max-h-96"
        >
          {/* Header */}
          <div
            style={{ borderColor: 'var(--border-color)' }}
            className="px-4 py-3 border-b flex items-center justify-between"
          >
            <h3 style={{ color: 'var(--text-main)' }} className="font-semibold">
              Notificaciones {unreadCount > 0 && <span className="text-sm font-normal">({unreadCount})</span>}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div style={{ color: 'var(--text-muted)' }} className="p-4 text-center text-sm">
                Cargando...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }} className="p-8 text-center text-sm">
                <Bell size={32} className="mx-auto mb-2 opacity-20" />
                Sin notificaciones
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {notifications.map((notif) => {
                  const Icon = getNotificationIcon(notif.type)
                  const color = getNotificationColor(notif.type)

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleMarkAsRead(notif.id)}
                      className={`p-4 cursor-pointer transition-colors ${
                        notif.read
                          ? 'hover:bg-[var(--sidebar-bg)]'
                          : 'bg-blue-50/50 hover:bg-blue-100/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 flex-none"
                          style={{ backgroundColor: `${color}20`, color }}
                        >
                          <Icon size={18} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p style={{ color: 'var(--text-main)' }} className="font-medium text-sm">
                                {getNotificationTitle(notif.type)}
                              </p>
                              <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-0.5 leading-snug">
                                {notif.message}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleClear(notif.id)
                              }}
                              className="p-1 hover:bg-gray-300/20 rounded transition-colors flex-none"
                            >
                              <X size={16} style={{ color: 'var(--text-muted)' }} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <span style={{ color: 'var(--text-muted)' }} className="text-xs">
                              {formatDistanceToNow(new Date(notif.createdAt), {
                                addSuffix: true,
                                locale: es,
                              })}
                            </span>
                            {notif.actionUrl && (
                              <a
                                href={notif.actionUrl}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setIsOpen(false)
                                }}
                                className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1"
                              >
                                Ver <ChevronRight size={12} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
