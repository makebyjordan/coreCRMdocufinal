import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

export const useChatThreads = ({ skip = 0, limit = 20 } = {}) =>
  useQuery({
    queryKey: ['chat-threads', skip, limit],
    queryFn: () => api.get('/chat/threads', { params: { skip, limit } }).then(r => r.data),
    refetchInterval: 30000,
  });

export const useChatThread = (threadId) =>
  useQuery({
    queryKey: ['chat-thread', threadId],
    queryFn: () => api.get(`/chat/threads/${threadId}`).then(r => r.data),
    enabled: !!threadId,
    refetchInterval: 5000,
  });

export const useUnreadCount = () =>
  useQuery({
    queryKey: ['unread-count'],
    queryFn: () => api.get('/chat/unread').then(r => r.data),
    refetchInterval: 20000,
  });

export const useCreateChatThread = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/chat/threads', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat-threads'] }),
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/chat/messages', data),
    onSuccess: (_, vars) =>
      queryClient.invalidateQueries({ queryKey: ['chat-thread', vars.threadId] }),
  });
};

export const useMarkThreadAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (threadId) => api.post(`/chat/threads/${threadId}/mark-read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['unread-count'] }),
  });
};
