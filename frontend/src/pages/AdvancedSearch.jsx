import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function AdvancedSearch() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '' });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search', query],
    queryFn: () => (query.length > 2 ? api.post('/search/query', { query, entityType: 'all' }).then(r => r.data) : Promise.resolve([])),
    enabled: query.length > 2,
  });

  const { data: savedSearches = [] } = useQuery({
    queryKey: ['saved-searches'],
    queryFn: () => api.get('/search/saved').then(r => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      api.post('/search/saved', { name: `Search: ${query}`, filters: { query, ...filters } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-searches'] }),
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Búsqueda Avanzada</h1>

      <div className="bg-white rounded-lg shadow p-8 mb-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Búsqueda</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Dirección, cliente, referencia..."
              className="w-full border rounded px-4 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Precio Mín</label>
              <input
                type="number"
                value={filters.minPrice}
                onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                className="w-full border rounded px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Precio Máx</label>
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                className="w-full border rounded px-4 py-2"
              />
            </div>
          </div>

          <button
            onClick={() => saveMutation.mutate()}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            Guardar Búsqueda
          </button>
        </div>
      </div>

      {isLoading && <div className="text-center py-8">Buscando...</div>}

      <div className="grid gap-4">
        {results.results &&
          results.results.map((item) => {
            const isExpedient = !!item.code;
            return (
              <div
                key={item.id}
                className="bg-white p-6 rounded-lg shadow hover:shadow-md cursor-pointer transition-shadow"
                onClick={() => navigate(isExpedient ? `/expedients/${item.id}` : `/clients/${item.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium mr-2 ${isExpedient ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {isExpedient ? 'Expediente' : 'Cliente'}
                    </span>
                    <span className="font-semibold">{item.code || `${item.firstName} ${item.lastName || ''}`}</span>
                  </div>
                  <span className="text-blue-500 text-sm">Ver →</span>
                </div>
                <p className="text-gray-600 mt-1">{item.propertyAddress || item.email}</p>
                {item.propertyPrice && <p className="text-green-600 font-bold">€{item.propertyPrice.toLocaleString()}</p>}
                {item.currentPhase && <p className="text-gray-400 text-xs mt-1">Fase: {item.currentPhase}</p>}
              </div>
            );
          })}
      </div>

      {savedSearches.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Búsquedas Guardadas</h2>
          <div className="space-y-2">
            {savedSearches.map((s) => (
              <button
                key={s.id}
                onClick={() => setQuery(JSON.parse(s.filters).query)}
                className="block w-full text-left p-3 bg-blue-100 hover:bg-blue-200 rounded"
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
