import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../api/client';

export const useAuditTrail = (expedientId) =>
  useQuery({
    queryKey: ['audit-trail', expedientId],
    queryFn: () => api.get(`/audit/trail/${expedientId}`).then(r => r.data),
    enabled: !!expedientId,
  });

export const useUserActivityLog = (userId, params = {}) =>
  useQuery({
    queryKey: ['user-activity', userId, params],
    queryFn: () => api.get(`/audit/user-activity/${userId}`, { params }).then(r => r.data),
    enabled: !!userId,
  });

export const useChangeHistory = (expedientId, fieldName) =>
  useQuery({
    queryKey: ['change-history', expedientId, fieldName],
    queryFn: () => api.get(`/audit/change-history/${expedientId}/${fieldName}`).then(r => r.data),
    enabled: !!expedientId && !!fieldName,
  });

export const useAuditStatistics = () =>
  useQuery({
    queryKey: ['audit-statistics'],
    queryFn: () => api.get('/audit/statistics').then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });

export const useExportAuditLog = () =>
  useMutation({
    mutationFn: (params) => api.get('/audit/export', { params }),
  });
