import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

export const useKeyboardShortcuts = () =>
  useQuery({
    queryKey: ['shortcuts'],
    queryFn: () => api.get('/productivity/shortcuts').then(r => r.data),
  });

export const useSetShortcut = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ shortcutKey, action }) =>
      api.post('/productivity/shortcuts', { shortcutKey, action }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shortcuts'] }),
  });
};

export const useExecuteBulkAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ actionType, expedientIds, parameters }) =>
      api.post('/productivity/bulk-actions', { actionType, expedientIds, parameters }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expedients'] }),
  });
};

export const useBulkActionStatus = (bulkActionId) =>
  useQuery({
    queryKey: ['bulk-action', bulkActionId],
    queryFn: () =>
      api.get(`/productivity/bulk-actions/${bulkActionId}`).then(r => r.data),
    enabled: !!bulkActionId,
    refetchInterval: (data) =>
      data?.status === 'EXECUTING' ? 2000 : false,
  });

export const useDuplicateExpedient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ expedientId, overrides }) =>
      api.post(`/productivity/expedients/${expedientId}/duplicate`, { overrides }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expedients'] }),
  });
};

export const useCalendarAvailability = (userId, dateFrom, dateTo) =>
  useQuery({
    queryKey: ['calendar-availability', userId, dateFrom, dateTo],
    queryFn: () =>
      api
        .get(`/productivity/calendar-availability/${userId}`, {
          params: { dateFrom, dateTo },
        })
        .then(r => r.data),
    enabled: !!userId && !!dateFrom && !!dateTo,
  });

export const useExpedientTemplates = (userId) =>
  useQuery({
    queryKey: ['expedient-templates', userId],
    queryFn: () =>
      api.get(`/productivity/expedient-templates/${userId}`).then(r => r.data),
    enabled: !!userId,
  });
