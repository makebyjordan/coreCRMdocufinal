import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function Reports() {
  const [exportFormat, setExportFormat] = useState('CSV');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { register, handleSubmit } = useForm({
    defaultValues: {
      operationType: 'VENTA',
      dateFrom: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0],
    },
  });

  // Obtener reportes del usuario
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => api.get('/reporting/reports').then(res => res.data?.data || []),
    retry: false,
  });

  // Exportar expedientes
  const exportMutation = useMutation({
    mutationFn: (filters) =>
      api.post('/reporting/export', {
        format: exportFormat,
        ...filters,
      }),
    onSuccess: (data) => {
      window.location.href = data.data.downloadUrl;
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const onExport = (formData) => {
    exportMutation.mutate(formData);
  };

  const onDelete = async (reportId) => {
    if (!window.confirm('¿Eliminar este reporte?')) return;
    try {
      await api.delete(`/reporting/reports/${reportId}`);
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    } catch (error) {
      console.error('Error deleting report:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">📊 Reportes y Análisis</h1>
        <div className="flex gap-2">
          <button onClick={() => navigate('/market')} className="text-sm px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
            🌐 Mercado
          </button>
          <button onClick={() => navigate('/clients/segmentation')} className="text-sm px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
            👥 Segmentación
          </button>
        </div>
      </div>

      {/* Export Form */}
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-semibold mb-6">Exportar Expedientes</h2>

        <form onSubmit={handleSubmit(onExport)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Operación</label>
              <select {...register('operationType')} className="w-full border rounded px-3 py-2">
                <option value="VENTA">Venta</option>
                <option value="ALQUILER">Alquiler</option>
                <option value="COMPRA">Compra</option>
                <option value="INVERSION">Inversión</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Formato</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="CSV">CSV</option>
                <option value="XLSX">Excel</option>
                <option value="PDF">PDF</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Desde</label>
              <input type="date" {...register('dateFrom')} className="w-full border rounded px-3 py-2" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Hasta</label>
              <input type="date" {...register('dateTo')} className="w-full border rounded px-3 py-2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={exportMutation.isPending}
            className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {exportMutation.isPending ? 'Exportando...' : 'Exportar Ahora'}
          </button>
        </form>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-8 border-b">
          <h2 className="text-2xl font-semibold">Mis Reportes</h2>
        </div>

        {reportsLoading ? (
          <div className="p-8 text-center">Cargando reportes...</div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Sin reportes aún. Genera uno usando el formulario arriba.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Nombre</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Tipo</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Formato</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Fecha</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.id} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-4">{report.name}</td>
                    <td className="px-6 py-4">{report.type}</td>
                    <td className="px-6 py-4">{report.format}</td>
                    <td className="px-6 py-4">
                      {new Date(report.generatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 space-x-2">
                      <a
                        href={report.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Descargar
                      </a>
                      <button
                        onClick={() => onDelete(report.id)}
                        className="text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
