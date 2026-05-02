import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

export const useReports = ({ skip = 0, limit = 20 } = {}) =>
  useQuery({
    queryKey: ['reports', skip, limit],
    queryFn: () => api.get('/reporting/reports', { params: { skip, limit } }).then(r => r.data),
  });

export const useKPIDashboard = () =>
  useQuery({
    queryKey: ['kpi-dashboard'],
    queryFn: () => api.get('/reporting/kpi-dashboard').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

export const useTimelineAnalysis = (operationType) =>
  useQuery({
    queryKey: ['timeline-analysis', operationType],
    queryFn: () =>
      api.get(`/reporting/timeline-analysis/${operationType}`).then(r => r.data),
    enabled: !!operationType,
  });

export const useExportExpedients = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (filters) => api.post('/reporting/export', filters),
    onSuccess: (data) => {
      if (data.data.downloadUrl) window.location.href = data.data.downloadUrl;
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

export const useGenerateCommissionReport = () =>
  useMutation({
    mutationFn: (params) => api.post('/reporting/commission-report', params),
  });

export const useDeleteReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId) => api.delete(`/reporting/reports/${reportId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports'] }),
  });
};
