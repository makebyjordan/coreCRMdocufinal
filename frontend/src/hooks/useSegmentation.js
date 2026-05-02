import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

export const useClientValueScore = (clientId) =>
  useQuery({
    queryKey: ['client-score', clientId],
    queryFn: () =>
      api.get(`/clients-advanced/${clientId}/value-score`).then(r => r.data),
    enabled: !!clientId,
    staleTime: 60 * 60 * 1000,
  });

export const useReferralChain = (clientId) =>
  useQuery({
    queryKey: ['referral-chain', clientId],
    queryFn: () =>
      api.get(`/clients-advanced/${clientId}/referrals`).then(r => r.data),
    enabled: !!clientId,
  });

export const useClientValueHistory = (clientId) =>
  useQuery({
    queryKey: ['client-value-history', clientId],
    queryFn: () =>
      api.get(`/clients-advanced/${clientId}/value-history`).then(r => r.data),
    enabled: !!clientId,
  });

export const useClientsBySegment = (segment) =>
  useQuery({
    queryKey: ['clients-by-segment', segment],
    queryFn: () =>
      api.get(`/clients-advanced/by-segment/${segment}`).then(r => r.data),
    enabled: !!segment,
  });

export const useCreateReferral = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ referrerId, referredId, notes }) =>
      api.post(`/clients-advanced/${referrerId}/refer/${referredId}`, { notes }),
    onSuccess: (_, vars) =>
      queryClient.invalidateQueries({ queryKey: ['referral-chain', vars.referrerId] }),
  });
};

export const useUpdateValueEstimate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, estimatedValue }) =>
      api.put(`/clients-advanced/${clientId}/value-estimate`, { estimatedValue }),
    onSuccess: (_, vars) =>
      queryClient.invalidateQueries({ queryKey: ['client-score', vars.clientId] }),
  });
};
