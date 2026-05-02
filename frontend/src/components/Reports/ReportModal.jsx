import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { X, Download, FileText, File, ArrowLeft } from 'lucide-react'
import api from '../../api/client'

export default function ReportModal({ isOpen, onClose }) {
  const [selectedClientId, setSelectedClientId] = useState('')
  const [reportData, setReportData] = useState(null)

  // Get all clients
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-report'],
    queryFn: () => api.get('/clients').then(r => r.data?.data || []),
    enabled: isOpen,
  })

  // Get report data
  const reportMutation = useMutation({
    mutationFn: (clientId) =>
      api.get(`/reports/client/${clientId}`).then(r => r.data),
    onSuccess: (data) => setReportData(data),
  })

  // Handle client selection
  const handleSelectClient = (clientId) => {
    setSelectedClientId(clientId)
    setReportData(null)
    reportMutation.mutate(clientId)
  }

  // Download PDF
  const handleDownloadPDF = async () => {
    if (selectedClientId) {
      try {
        const response = await api.get(`/reports/client/${selectedClientId}/pdf`, {
          responseType: 'blob'
        })
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `reporte-${reportData.client.name}.pdf`)
        document.body.appendChild(link)
        link.click()
        link.parentNode.removeChild(link)
      } catch (error) {
        console.error('Error descargando PDF:', error)
        alert('Error al descargar PDF')
      }
    }
  }

  // Download Excel
  const handleDownloadExcel = async () => {
    if (selectedClientId) {
      try {
        const response = await api.get(`/reports/client/${selectedClientId}/excel`, {
          responseType: 'blob'
        })
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `reporte-${reportData.client.name}.xlsx`)
        document.body.appendChild(link)
        link.click()
        link.parentNode.removeChild(link)
      } catch (error) {
        console.error('Error descargando Excel:', error)
        alert('Error al descargar Excel')
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {reportData && (
              <button
                onClick={() => setReportData(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                title="Volver a la lista de clientes"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h2 className="text-2xl font-bold">
              {reportData ? `Reporte: ${reportData.client.name}` : 'Generar Reporte'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!reportData ? (
            <div className="space-y-4">
              <p className="text-gray-600 font-medium">Selecciona un cliente:</p>
              <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                {clients.map(client => (
                  <button
                    key={client.id}
                    onClick={() => handleSelectClient(client.id)}
                    disabled={reportMutation.isPending}
                    className="text-left p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition disabled:opacity-50"
                  >
                    <p className="font-semibold text-gray-900">{client.name}</p>
                    <p className="text-sm text-gray-500">{client.dni || 'Sin DNI'}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Client Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 text-xs font-semibold mb-1">Nombre</p>
                    <p className="font-bold text-lg">{reportData.client.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs font-semibold mb-1">DNI</p>
                    <p className="font-semibold">{reportData.client.dni || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs font-semibold mb-1">Email</p>
                    <p className="font-semibold">{reportData.client.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs font-semibold mb-1">Teléfono</p>
                    <p className="font-semibold">{reportData.client.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs font-semibold mb-1">Fuente</p>
                    <p className="font-semibold">{reportData.client.source || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-gray-600 text-sm">Expedientes</p>
                  <p className="text-2xl font-bold text-blue-600">{reportData.summary.totalExpedients}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-gray-600 text-sm">Cerrados</p>
                  <p className="text-2xl font-bold text-green-600">{reportData.summary.closedExpedients}</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-gray-600 text-sm">En proceso</p>
                  <p className="text-2xl font-bold text-orange-600">{reportData.summary.pendingExpedients}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-gray-600 text-sm">Comisiones</p>
                  <p className="text-2xl font-bold text-purple-600">€{reportData.summary.totalCommissions.toFixed(0)}</p>
                </div>
              </div>

              {/* Expedients */}
              {reportData.expedients.length > 0 && (
                <div>
                  <h3 className="font-bold text-lg mb-3">Expedientes ({reportData.expedients.length})</h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                    {reportData.expedients.map(exp => (
                      <div key={exp.id} className="border-b border-gray-100 pb-3 last:border-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-bold text-gray-900">{exp.code}</p>
                            <p className="text-sm font-semibold text-blue-600">{exp.operationType || 'Sin tipo'}</p>
                          </div>
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">{exp.phase}</span>
                        </div>
                        <p className="text-sm text-gray-600">{exp.propertyAddress || 'Sin dirección'}</p>
                        {exp.propertyCity && (
                          <p className="text-xs text-gray-500">{exp.propertyCity}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Downloads */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setReportData(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Seleccionar otro cliente
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                >
                  <FileText size={18} />
                  PDF
                </button>
                <button
                  onClick={handleDownloadExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                >
                  <File size={18} />
                  Excel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
