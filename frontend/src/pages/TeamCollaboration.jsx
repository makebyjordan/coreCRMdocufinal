import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import {
  Search, Plus, Send, MessageSquare, Users, X,
  ChevronLeft, Check, CheckCheck, Paperclip
} from 'lucide-react'
import api from '../api/client'
import useAuthStore from '../store/authStore'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(date) {
  if (!date) return ''
  const now = new Date()
  const d = new Date(date)
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'ahora'
  if (diffMins < 60) return `${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d`
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

function getInitials(name = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-red-500', 'bg-indigo-500',
]
function avatarColor(name = '') {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

function Avatar({ name, size = 'md' }) {
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm'
  return (
    <div className={`${sz} rounded-full ${avatarColor(name)} text-white flex items-center justify-center font-semibold shrink-0`}>
      {getInitials(name)}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TeamCollaboration() {
  const [selectedThreadId, setSelectedThreadId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [messageText, setMessageText] = useState('')
  const [searchParams] = useSearchParams()
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedThreadId])

  // Pre-fill desde expediente
  useEffect(() => {
    const expId = searchParams.get('expedientId')
    if (expId) setShowNewChat(true)
  }, [searchParams])

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: threadsData = { threads: [] }, isLoading: loadingThreads } = useQuery({
    queryKey: ['chat-threads'],
    queryFn: () => api.get('/chat/threads').then(r => r.data),
    refetchInterval: 8000,
  })

  const { data: threadDetail } = useQuery({
    queryKey: ['chat-thread', selectedThreadId],
    queryFn: () => api.get(`/chat/threads/${selectedThreadId}`).then(r => r.data),
    enabled: !!selectedThreadId,
    refetchInterval: 4000,
    onSuccess: () => {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    },
  })

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-for-chat'],
    queryFn: () => api.get('/users').then(r => r.data || []),
    enabled: showNewChat,
  })

  const { data: unread = { unreadCount: 0 } } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => api.get('/chat/unread').then(r => r.data),
    refetchInterval: 10000,
  })

  // ── Mutations ────────────────────────────────────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: () => api.post('/chat/messages', {
      threadId: selectedThreadId,
      content: messageText.trim(),
    }),
    onSuccess: () => {
      setMessageText('')
      qc.invalidateQueries({ queryKey: ['chat-thread', selectedThreadId] })
      qc.invalidateQueries({ queryKey: ['chat-threads'] })
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    },
  })

  const directMutation = useMutation({
    mutationFn: (targetUserId) => api.post('/chat/direct', { targetUserId }),
    onSuccess: (res) => {
      setSelectedThreadId(res.data.id)
      setShowNewChat(false)
      qc.invalidateQueries({ queryKey: ['chat-threads'] })
    },
  })

  // ── Derived data ─────────────────────────────────────────────────────────────
  const threads = threadsData.threads || []
  const filteredThreads = threads.filter(t => {
    if (!searchQuery) return true
    const subject = t.subject?.toLowerCase() || ''
    const lastMsg = t.messages?.[0]?.content?.toLowerCase() || ''
    const participants = t.participants?.map(p => p.user?.name?.toLowerCase()).join(' ') || ''
    const q = searchQuery.toLowerCase()
    return subject.includes(q) || lastMsg.includes(q) || participants.includes(q)
  })

  const otherUsers = allUsers.filter(u => u.id !== user?.id)
  const selectedThread = threadDetail

  function handleSend(e) {
    e?.preventDefault()
    if (!messageText.trim() || sendMutation.isPending) return
    sendMutation.mutate()
  }

  function getThreadDisplayName(thread) {
    if (!thread) return ''
    if (thread.isDirect) {
      const other = thread.participants?.find(p => p.user?.id !== user?.id)
      return other?.user?.name || 'Usuario'
    }
    return thread.subject || thread.expedient?.code || 'Conversación'
  }

  function getThreadAvatar(thread) {
    if (!thread) return ''
    if (thread.isDirect) {
      const other = thread.participants?.find(p => p.user?.id !== user?.id)
      return other?.user?.name || '?'
    }
    return thread.subject?.[0]?.toUpperCase() || '#'
  }

  function getLastMessage(thread) {
    const msg = thread.messages?.[0]
    if (!msg) return 'Sin mensajes'
    const isMine = msg.user?.id === user?.id || msg.userId === user?.id
    const prefix = isMine ? 'Tú: ' : (msg.user?.name ? `${msg.user.name.split(' ')[0]}: ` : '')
    return `${prefix}${msg.content}`
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white overflow-hidden">

      {/* ── LEFT PANEL: Conversations list ────────────────────────────────────── */}
      <div className={`${selectedThreadId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 border-r border-gray-200 bg-white shrink-0`}>

        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">Mensajes</h1>
            <div className="flex items-center gap-2">
              {unread.unreadCount > 0 && (
                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                  {unread.unreadCount}
                </span>
              )}
              <button
                onClick={() => setShowNewChat(true)}
                className="w-9 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition"
                title="Nueva conversación"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar conversación..."
              className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          {loadingThreads ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              Cargando...
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-8">
              <MessageSquare size={40} className="text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm font-medium">Sin conversaciones</p>
              <p className="text-gray-400 text-xs mt-1">Pulsa + para empezar a chatear</p>
            </div>
          ) : (
            filteredThreads.map(thread => {
              const displayName = getThreadDisplayName(thread)
              const avatarName = getThreadAvatar(thread)
              const lastMsg = getLastMessage(thread)
              const isSelected = selectedThreadId === thread.id
              const myParticipant = thread.participants?.find(p => p.user?.id === user?.id)
              const hasUnread = myParticipant?.unreadCount > 0

              return (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition border-b border-gray-50 ${isSelected ? 'bg-blue-50 border-blue-100' : ''}`}
                >
                  <Avatar name={avatarName} />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${hasUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                        {displayName}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {timeAgo(thread.lastMessageAt || thread.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className={`text-xs truncate ${hasUnread ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                        {lastMsg}
                      </p>
                      {hasUnread && (
                        <span className="shrink-0 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                          {myParticipant.unreadCount > 9 ? '9+' : myParticipant.unreadCount}
                        </span>
                      )}
                    </div>
                    {!thread.isDirect && thread.expedient && (
                      <p className="text-[10px] text-blue-500 truncate mt-0.5">{thread.expedient.code}</p>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: Messages ─────────────────────────────────────────────── */}
      <div className={`${selectedThreadId ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>

        {!selectedThreadId ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquare size={36} className="text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Tus mensajes</h2>
            <p className="text-gray-500 text-sm text-center max-w-xs">
              Selecciona una conversación o empieza una nueva con un compañero
            </p>
            <button
              onClick={() => setShowNewChat(true)}
              className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium"
            >
              Nueva conversación
            </button>
          </div>
        ) : !selectedThread ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
              <button
                onClick={() => setSelectedThreadId(null)}
                className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-600"
              >
                <ChevronLeft size={20} />
              </button>
              <Avatar name={getThreadDisplayName(selectedThread)} />
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-gray-900 truncate">{getThreadDisplayName(selectedThread)}</h2>
                <p className="text-xs text-gray-500">
                  {selectedThread.isDirect
                    ? 'Mensaje directo'
                    : selectedThread.expedient
                      ? `Expediente: ${selectedThread.expedient.code}`
                      : `${selectedThread.participants?.length || 0} participantes`
                  }
                </p>
              </div>
              {/* Participants avatars */}
              <div className="hidden sm:flex items-center -space-x-2">
                {selectedThread.participants?.slice(0, 4).map(p => (
                  <div key={p.user?.id} title={p.user?.name}>
                    <Avatar name={p.user?.name || '?'} size="sm" />
                  </div>
                ))}
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gray-50">
              {!selectedThread.messages || selectedThread.messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <MessageSquare size={32} className="text-gray-300 mb-2" />
                  <p className="text-gray-400 text-sm">Sin mensajes aún. ¡Empieza la conversación!</p>
                </div>
              ) : (
                (() => {
                  let lastDate = null
                  return selectedThread.messages.map((msg, idx) => {
                    const isMine = msg.userId === user?.id || msg.user?.id === user?.id
                    const authorName = msg.user?.name || 'Usuario'
                    const msgDate = new Date(msg.createdAt).toLocaleDateString('es-ES', {
                      weekday: 'long', day: 'numeric', month: 'long'
                    })
                    const showDate = msgDate !== lastDate
                    lastDate = msgDate

                    const prevMsg = idx > 0 ? selectedThread.messages[idx - 1] : null
                    const sameAuthor = prevMsg &&
                      (prevMsg.userId === msg.userId || prevMsg.user?.id === msg.user?.id) &&
                      !showDate

                    return (
                      <React.Fragment key={msg.id}>
                        {showDate && (
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-xs text-gray-400 bg-gray-50 px-2 capitalize">{msgDate}</span>
                            <div className="flex-1 h-px bg-gray-200" />
                          </div>
                        )}
                        <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'} ${sameAuthor ? 'mt-0.5' : 'mt-3'}`}>
                          {/* Avatar (only for others, only on last in group) */}
                          {!isMine ? (
                            sameAuthor
                              ? <div className="w-8 shrink-0" />
                              : <Avatar name={authorName} size="sm" />
                          ) : null}

                          <div className={`max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                            {/* Author name (only for others, only on first in group) */}
                            {!isMine && !sameAuthor && (
                              <span className="text-xs font-semibold text-gray-600 ml-1">{authorName}</span>
                            )}

                            <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                              isMine
                                ? 'bg-blue-600 text-white rounded-br-sm'
                                : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'
                            }`}>
                              {msg.content}
                            </div>

                            <div className={`flex items-center gap-1 px-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                              <span className="text-[10px] text-gray-400">
                                {new Date(msg.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {msg.edited && <span className="text-[10px] text-gray-400">· editado</span>}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    )
                  })
                })()
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="px-4 py-3 bg-white border-t border-gray-200">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-2.5">
                  <input
                    ref={inputRef}
                    type="text"
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 bg-transparent text-sm focus:outline-none text-gray-800 placeholder-gray-500"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={!messageText.trim() || sendMutation.isPending}
                  className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-full flex items-center justify-center transition shrink-0"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* ── NEW CHAT MODAL ────────────────────────────────────────────────────── */}
      {showNewChat && (
        <NewChatModal
          users={otherUsers}
          currentUserId={user?.id}
          onSelectUser={targetUserId => directMutation.mutate(targetUserId)}
          onClose={() => setShowNewChat(false)}
          isPending={directMutation.isPending}
        />
      )}
    </div>
  )
}

// ─── New Chat Modal ───────────────────────────────────────────────────────────
function NewChatModal({ users, currentUserId, onSelectUser, onClose, isPending }) {
  const [search, setSearch] = useState('')
  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">Nueva conversación</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar colaborador..."
              className="w-full pl-9 pr-3 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* User list */}
        <div className="overflow-y-auto max-h-72 px-2 pb-3">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <Users size={28} className="mx-auto mb-2 opacity-50" />
              Sin colaboradores encontrados
            </div>
          ) : (
            filtered.map(u => {
              const roles = u.userRoles?.map(r => r.role).join(', ') || ''
              return (
                <button
                  key={u.id}
                  onClick={() => onSelectUser(u.id)}
                  disabled={isPending}
                  className="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 rounded-xl transition disabled:opacity-50"
                >
                  <Avatar name={u.name} />
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{u.name}</p>
                    <p className="text-xs text-gray-500 truncate">{roles || u.email}</p>
                  </div>
                  {isPending ? (
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <MessageSquare size={16} className="text-gray-400 shrink-0" />
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
