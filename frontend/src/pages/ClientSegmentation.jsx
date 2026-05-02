import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const SEGMENTS = ['VIP', 'NORMAL', 'RIESGO', 'DORMIDO'];
const SEGMENT_COLORS = {
  VIP: 'bg-purple-100 text-purple-800',
  NORMAL: 'bg-green-100 text-green-800',
  RIESGO: 'bg-orange-100 text-orange-800',
  DORMIDO: 'bg-gray-100 text-gray-800',
};

export default function ClientSegmentation() {
  const [activeSegment, setActiveSegment] = useState('VIP');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data = [], isLoading } = useQuery({
    queryKey: ['clients-by-segment', activeSegment],
    queryFn: () => api.get(`/clients-advanced/by-segment/${activeSegment}`).then(r => r.data || []),
  });
  
  const segmentData = { clients: Array.isArray(data) ? data : (data?.clients || []) };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Segmentación de Clientes</h1>

      {/* Tabs de segmento */}
      <div className="flex gap-2 mb-8">
        {SEGMENTS.map((seg) => (
          <button
            key={seg}
            onClick={() => setActiveSegment(seg)}
            className={`px-6 py-2 rounded-full font-semibold transition ${
              activeSegment === seg
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {seg}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12">Cargando clientes...</div>
      ) : (segmentData?.clients || []).length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No hay clientes en el segmento {activeSegment}
        </div>
      ) : (
        <div className="grid gap-4">
          {segmentData.clients.map((client) => (
            <div
              key={client.id}
              className="bg-white rounded-lg shadow p-6 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/clients/${client.id}`)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                  {(client.firstName?.[0] || client.companyName?.[0] || '?').toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold">
                    {client.firstName ? `${client.firstName} ${client.lastName}` : client.companyName}
                  </div>
                  <div className="text-sm text-gray-500">{client.email}</div>
                  {client.phone && <div className="text-sm text-gray-400">{client.phone}</div>}
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{client.segmentScore || 0}</div>
                  <div className="text-xs text-gray-500">Score</div>
                </div>

                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${SEGMENT_COLORS[activeSegment]}`}>
                  {activeSegment}
                </span>

                {client.valueEstimate && (
                  <div className="text-right">
                    <div className="font-semibold text-green-600">€{parseInt(client.valueEstimate).toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Valor estimado</div>
                  </div>
                )}

                <span className="text-blue-500 text-sm font-medium">Ver perfil →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        Total: {segmentData.totalClients || 0} clientes en segmento {activeSegment}
      </div>
    </div>
  );
}
