import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

export const useFullTextSearch = (query, options = {}) =>
  useQuery({
    queryKey: ['search', query],
    queryFn: () => api.post('/search/query', { query }).then(r => r.data),
    enabled: query?.length > 2,
    ...options,
  });

export const useSavedSearches = () =>
  useQuery({
    queryKey: ['saved-searches'],
    queryFn: () => api.get('/search/saved').then(r => r.data),
  });

export const useSaveSearch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, filters }) => api.post('/search/saved', { name, filters }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-searches'] }),
  });
};

export const useDeleteSavedSearch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (searchId) => api.delete(`/search/saved/${searchId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-searches'] }),
  });
};

export const useSearchByPrice = () =>
  useMutation({
    mutationFn: (params) => api.post('/search/by-price', params),
  });

export const useSearchByDate = () =>
  useMutation({
    mutationFn: (params) => api.post('/search/by-date', params),
  });
