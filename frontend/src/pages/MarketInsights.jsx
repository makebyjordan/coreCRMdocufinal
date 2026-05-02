import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../api/client';

export default function MarketInsights() {
  const [city, setCity] = useState('Barcelona');
  const [propertyType, setPropertyType] = useState('RESIDENTIAL');
  const [timeRange, setTimeRange] = useState('6M');
  const [valuationForm, setValuationForm] = useState({ address: '', sqm: '', bedrooms: '', city: 'Barcelona' });

  // TODO: Implementar endpoints reales para market data
  const { data: marketData = null } = useQuery({
    queryKey: ['market-data', city],
    queryFn: () => api.get(`/forecast/market-data/${city}/Centro`).then(r => r.data),
    enabled: false, // Deshabilitado por ahora
  });

  const { data: trendData = { dataPoints: [] } } = useQuery({
    queryKey: ['trend-data', city, propertyType, timeRange],
    queryFn: () =>
      api.get(`/forecast/trend-data/${city}/${propertyType}`, { params: { timeRange } }).then(r => r.data),
    enabled: false, // Deshabilitado por ahora
  });

  const valuationMutation = useMutation({
    mutationFn: () => api.post('/forecast/property-valuation', valuationForm),
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Insights de Mercado</h1>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex gap-4">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ciudad..."
            className="flex-1 border rounded px-3 py-2"
          />
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="RESIDENTIAL">Residencial</option>
            <option value="COMMERCIAL">Comercial</option>
            <option value="INDUSTRIAL">Industrial</option>
          </select>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="3M">3 meses</option>
            <option value="6M">6 meses</option>
            <option value="1Y">1 año</option>
          </select>
        </div>
      </div>

      {/* Datos del mercado */}
      {marketData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="text-gray-500 text-sm">Precio Medio</div>
            <div className="text-2xl font-bold text-blue-600">€{parseInt(marketData.avgPrice || 0).toLocaleString()}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="text-gray-500 text-sm">€/m²</div>
            <div className="text-2xl font-bold text-green-600">€{parseInt(marketData.avgPricePerSqm || 0).toLocaleString()}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="text-gray-500 text-sm">Ventas</div>
            <div className="text-2xl font-bold text-purple-600">{marketData.saleCount || 0}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="text-gray-500 text-sm">Tendencia</div>
            <div className={`text-2xl font-bold ${(marketData.trendPercentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(marketData.trendPercentage || 0) > 0 ? '+' : ''}{marketData.trendPercentage || 0}%
            </div>
          </div>
        </div>
      )}

      {/* Tendencias */}
      {trendData.dataPoints?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Evolución €/m² — {city}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Mes</th>
                  <th className="py-2">€/m² Medio</th>
                  <th className="py-2">Nº Operaciones</th>
                </tr>
              </thead>
              <tbody>
                {trendData.dataPoints.map((dp) => (
                  <tr key={dp.month} className="border-b hover:bg-gray-50">
                    <td className="py-2">{dp.month}</td>
                    <td className="py-2 font-semibold">€{dp.avgPricePerSqm?.toLocaleString()}</td>
                    <td className="py-2">{dp.saleCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Valoración de propiedad */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Valorar Propiedad</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <input
            value={valuationForm.address}
            onChange={(e) => setValuationForm({ ...valuationForm, address: e.target.value })}
            placeholder="Dirección..."
            className="border rounded px-3 py-2"
          />
          <input
            value={valuationForm.city}
            onChange={(e) => setValuationForm({ ...valuationForm, city: e.target.value })}
            placeholder="Ciudad..."
            className="border rounded px-3 py-2"
          />
          <input
            type="number"
            value={valuationForm.sqm}
            onChange={(e) => setValuationForm({ ...valuationForm, sqm: e.target.value })}
            placeholder="m²..."
            className="border rounded px-3 py-2"
          />
          <input
            type="number"
            value={valuationForm.bedrooms}
            onChange={(e) => setValuationForm({ ...valuationForm, bedrooms: e.target.value })}
            placeholder="Habitaciones..."
            className="border rounded px-3 py-2"
          />
        </div>
        <button
          onClick={() => valuationMutation.mutate()}
          disabled={!valuationForm.sqm || !valuationForm.city}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300"
        >
          Calcular Valoración
        </button>
        {valuationMutation.data && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-700">
              €{valuationMutation.data.data.estimatedPrice?.toLocaleString() || 'N/A'}
            </div>
            <div className="text-sm text-gray-600">
              €{valuationMutation.data.data.pricePerSqm?.toLocaleString()}/m² · {valuationMutation.data.data.comparableCount} comparables
              · Confianza: {valuationMutation.data.data.confidence}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
