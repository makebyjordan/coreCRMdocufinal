import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import useAuthStore from '../store/authStore';

export default function TeamCollaboration() {
  const [selectedThread, setSelectedThread] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [newThreadSubject, setNewThreadSubject] = useState('');
  const [newExpedientId, setNewExpedientId] = useState('');
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  // Pre-fill expedient if coming from ExpedientDetail
  useEffect(() => {
    const expId = searchParams.get('expedientId');
    const subject = searchParams.get('subject');
    if (expId) setNewExpedientId(expId);
    if (subject) setNewThreadSubject(subject);
  }, [searchParams]);

  const { data: threadsData = { threads: [] }, isLoading } = useQuery({
    queryKey: ['chat-threads'],
    queryFn: () => api.get('/chat/threads').then(r => r.data),
    refetchInterval: 10000,
  });

  const { data: threadDetail = null } = useQuery({
    queryKey: ['chat-thread', selectedThread],
    queryFn: () => selectedThread ? api.get(`/chat/threads/${selectedThread}`).then(r => r.data) : null,
    enabled: !!selectedThread,
    refetchInterval: 5000,
  });

  const { data: unread = { unreadCount: 0 } } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => api.get('/chat/unread').then(r => r.data),
    refetchInterval: 15000,
  });

  const sendMutation = useMutation({
    mutationFn: () => api.post('/chat/messages', {
      threadId: selectedThread,
      content: newMessage,
    }),
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['chat-thread', selectedThread] });
    },
  });

  const createThreadMutation = useMutation({
    mutationFn: () => api.post('/chat/threads', {
      expedientId: newExpedientId,
      subject: newThreadSubject,
    }),
    onSuccess: (res) => {
      setSelectedThread(res.data.id);
      setNewThreadSubject('');
      setNewExpedientId('');
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    },
  });

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b px-8 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Chat del Equipo</h1>
        {unread.unreadCount > 0 && (
          <span className="bg-red-500 text-white text-sm px-3 py-1 rounded-full">
            {unread.unreadCount} sin leer
          </span>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar de threads */}
        <div className="w-80 border-r bg-gray-50 flex flex-col">
          {/* Nuevo thread */}
          <div className="p-4 border-b bg-white">
            <input
              value={newExpedientId}
              onChange={(e) => setNewExpedientId(e.target.value)}
              placeholder="ID del expediente..."
              className="w-full border rounded px-3 py-2 mb-2 text-sm"
            />
            <input
              value={newThreadSubject}
              onChange={(e) => setNewThreadSubject(e.target.value)}
              placeholder="Asunto del hilo..."
              className="w-full border rounded px-3 py-2 mb-2 text-sm"
            />
            <button
              onClick={() => createThreadMutation.mutate()}
              disabled={!newThreadSubject || !newExpedientId}
              className="w-full bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700 disabled:bg-gray-300"
            >
              + Nuevo hilo
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-gray-500">Cargando...</div>
            ) : threadsData.threads.length === 0 ? (
              <div className="p-4 text-gray-500 text-sm">No hay conversaciones</div>
            ) : (
              threadsData.threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThread(thread.id)}
                  className={`w-full text-left p-4 border-b hover:bg-blue-50 ${selectedThread === thread.id ? 'bg-blue-100' : ''}`}
                >
                  <div className="font-medium text-sm truncate">{thread.subject}</div>
                  <div className="text-xs text-gray-500">
                    {thread.expedient?.code} · {new Date(thread.lastMessageAt).toLocaleDateString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Área de mensajes */}
        <div className="flex-1 flex flex-col">
          {!selectedThread ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Selecciona una conversación
            </div>
          ) : !threadDetail ? (
            <div className="flex-1 flex items-center justify-center">Cargando...</div>
          ) : (
            <>
              <div className="p-4 border-b bg-white">
                <h2 className="font-semibold">{threadDetail.subject}</h2>
                <p className="text-sm text-gray-500">Expediente: {threadDetail.expedient?.code}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {threadDetail.messages?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.userId === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-md rounded-lg px-4 py-2 ${
                        msg.userId === user?.id ? 'bg-blue-600 text-white' : 'bg-gray-100'
                      }`}
                    >
                      {msg.userId !== user?.id && (
                        <div className="text-xs font-semibold mb-1 opacity-70">
                          {msg.author?.name}
                        </div>
                      )}
                      <div className="text-sm">{msg.content}</div>
                      <div className="text-xs mt-1 opacity-60">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t bg-white flex gap-2">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMutation.mutate()}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 border rounded px-3 py-2"
                />
                <button
                  onClick={() => sendMutation.mutate()}
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300"
                >
                  Enviar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
