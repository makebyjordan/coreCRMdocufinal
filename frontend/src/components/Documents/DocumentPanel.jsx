import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Upload, FileText, CheckCircle, XCircle,
  Download, Trash2, ExternalLink, Info, AlertCircle, Eye, Plus,
  History, Calendar,
} from 'lucide-react'
import api from '../../api/client'

// ─── Historial de validaciones de un documento ───────────────────────────────
function DocumentValidationHistory({ docId, onClose }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ status: 'APROBADO', comments: '', expiryDate: '' })

  const { data: validations = [], isLoading } = useQuery({
    queryKey: ['doc-validations', docId],
    queryFn: () => api.get(`/document-validations/document/${docId}`).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.post(`/document-validations/document/${docId}`, data),
    onSuccess: () => {
      toast.success('Validación registrada')
      qc.invalidateQueries(['doc-validations', docId])
      qc.invalidateQueries(['documents'])
      setShowForm(false)
      setForm({ status: 'APROBADO', comments: '', expiryDate: '' })
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Error al registrar'),
  })

  const STATUS_LABELS = {
    APROBADO: { label: 'Aprobado', color: 'text-green-400', bg: 'bg-green-500/10' },
    RECHAZADO: { label: 'Rechazado', color: 'text-red-400', bg: 'bg-red-500/10' },
    REQUIERE_CAMBIOS: { label: 'Requiere cambios', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  }

  return (
    <div className="mt-2 border border-[var(--border-color)] rounded-xl bg-[var(--bg-color)] p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Historial de validación</p>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(!showForm)} className="text-[10px] text-[var(--primary-color)] hover:underline">
            + Nueva validación
          </button>
          <button onClick={onClose} className="text-[10px] text-gray-400 hover:text-red-500">Cerrar</button>
        </div>
      </div>

      {showForm && (
        <div className="mb-3 p-3 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label text-[10px]">Estado</label>
              <select className="select text-xs py-1" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="APROBADO">Aprobado</option>
                <option value="RECHAZADO">Rechazado</option>
                <option value="REQUIERE_CAMBIOS">Requiere cambios</option>
              </select>
            </div>
            <div>
              <label className="label text-[10px]">Fecha caducidad</label>
              <input type="date" className="input text-xs py-1" value={form.expiryDate}
                onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label text-[10px]">Comentarios</label>
            <textarea className="input text-xs" rows={2} value={form.comments}
              onChange={e => setForm(f => ({ ...f, comments: e.target.value }))}
              placeholder="Observaciones opcionales..." />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn-secondary py-1 px-2 text-xs">Cancelar</button>
            <button
              onClick={() => createMutation.mutate({ ...form, expiryDate: form.expiryDate || undefined })}
              disabled={createMutation.isPending}
              className="btn-primary py-1 px-2 text-xs"
            >
              {createMutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {isLoading && <p className="text-xs text-gray-400 py-2">Cargando...</p>}

      {!isLoading && validations.length === 0 && (
        <p className="text-xs text-gray-400 py-2 text-center">Sin validaciones registradas</p>
      )}

      <div className="space-y-1.5">
        {validations.map(v => {
          const cfg = STATUS_LABELS[v.status] || { label: v.status, color: 'text-gray-400', bg: 'bg-gray-500/10' }
          const isExpired = v.expiryDate && new Date(v.expiryDate) < new Date()
          return (
            <div key={v.id} className={`flex gap-2 p-2 rounded-lg ${cfg.bg}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold ${cfg.color}`}>{cfg.label}</span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(v.validatedAt).toLocaleDateString('es-ES')}
                  </span>
                  {v.validator && (
                    <span className="text-[10px] text-gray-400">· {v.validator.name}</span>
                  )}
                  {v.expiryDate && (
                    <span className={`text-[10px] flex items-center gap-0.5 ${isExpired ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
                      <Calendar size={9} />
                      {isExpired ? 'CADUCADO' : `Cad. ${new Date(v.expiryDate).toLocaleDateString('es-ES')}`}
                    </span>
                  )}
                </div>
                {v.comments && (
                  <p className="text-[10px] text-gray-500 mt-0.5 italic">{v.comments}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const STATUS_CONFIG = {
  PENDIENTE: { label: 'Completado', icon: CheckCircle, color: 'text-green-600 bg-[var(--sidebar-bg)]' },
  SUBIDO:    { label: 'Subido', icon: FileText, color: 'text-blue-500 bg-[var(--sidebar-bg)]' },
  VALIDADO:  { label: 'Validado', icon: CheckCircle, color: 'text-green-600 bg-[var(--sidebar-bg)]' },
  RECHAZADO: { label: 'Rechazado', icon: XCircle, color: 'text-red-500 bg-[var(--sidebar-bg)]' },
}

// ─── Definición de documentos necesarios por flujo ────────────────────────────
// ✨ MEJORADO - Incluye TODOS los documentos del sector inmobiliario real
const REQUIRED_DOCS = {
  VENTA: [
    { type: 'DNI_NIE', label: 'DNI / NIE Vendedor', description: 'Documento vigente de todos los propietarios' },
    { type: 'DNI_NIE_CONYUGE', label: 'DNI / NIE Cónyuge', description: 'Si casado en gananciales' },
    { type: 'ESCRITURA', label: 'Escritura de Propiedad', description: 'Título de propiedad del inmueble' },
    { type: 'NOTA_SIMPLE', label: 'Nota Simple Registral', description: 'Menos de 3 meses de antigüedad' },
    { type: 'IBI', label: 'Último recibo IBI', description: 'Justificante de pago del año en curso' },
    { type: 'DEUDAS_COMUNIDAD', label: 'Certificado sin Deudas Comunidad', description: 'Emitido por el administrador' },
    { type: 'CERTIFICADO_ENERGETICO', label: 'Certificado Energético', description: 'Etiqueta y registro oficial' },
    { type: 'CEDULA_HABITABILIDAD', label: 'Cédula de Habitabilidad', description: 'En vigor (si aplica)' },
    { type: 'LICENCIA_PRIMERA_OCUPACION', label: 'Licencia Primera Ocupación', description: 'Si obra nueva <10 años' },
    { type: 'PLANOS_TECNICOS', label: 'Planos Técnicos', description: 'Del inmueble' },
    { type: 'LIBRO_EDIFICIO', label: 'Libro del Edificio', description: 'Si es promoción' },
    { type: 'ACTA_OBRA', label: 'Acta Final de Obra', description: 'Si obra nueva' },
    { type: 'SEGURO_DECENAL', label: 'Garantías y Seguro Decenal', description: 'Si construcción <10 años' },
    { type: 'ESTATUTOS_COMUNIDAD', label: 'Estatutos de la Comunidad', description: 'Normas comunitarias' },
    { type: 'FACTURAS_SUMINISTROS', label: 'Últimas Facturas Suministros', description: 'Agua, luz, gas pagadas' },
    { type: 'CERT_NO_CONCURSO', label: 'Certificado No Concurso', description: 'Si vendedor es empresa' },
  ],
  COMPRA: [
    { type: 'DNI_NIE', label: 'DNI / NIE Comprador', description: 'Documento vigente' },
    { type: 'DNI_NIE_CONYUGE', label: 'DNI / NIE Cónyuge', description: 'Si casado en gananciales' },
    { type: 'CERTIFICADO_ESTADO_CIVIL', label: 'Certificado Estado Civil', description: 'Soltero/casado/pareja de hecho' },
    { type: 'CIRBE', label: 'Informe CIRBE', description: 'Central de riesgos del Banco de España' },
    { type: 'EXTRACTOS_BANCO', label: 'Extractos Bancarios 6 meses', description: 'Últimos 6 meses de movimientos' },
    { type: 'NOMINAS', label: 'Últimas 3 Nóminas', description: 'Justificante de ingresos' },
    { type: 'CONTRATO_TRABAJO', label: 'Contrato de Trabajo Vigente', description: 'Acreditar estabilidad laboral' },
    { type: 'IRPF', label: 'Declaración IRPF', description: 'Último ejercicio presentado' },
    { type: 'VIDA_LABORAL', label: 'Vida Laboral', description: 'Actualizada a la fecha' },
    { type: 'JUSTIFICANTE_AHORROS', label: 'Justificante de Ahorros', description: 'Extracto o certificado de la entrada' },
    { type: 'DECLARACION_BIENES', label: 'Declaración de Bienes', description: 'Si autónomo o empresario' },
    { type: 'NOMINAS_CONYUGE', label: 'Nóminas y Contrato Cónyuge', description: 'Si compra conjunta' },
    { type: 'PREAPROBACION_HIPOTECARIA', label: 'Preaprobación Hipotecaria', description: 'Si ya solicitada' },
  ],
  ALQUILER: [
    { type: 'DNI_NIE', label: 'DNI / NIE Propietario', description: 'Documento vigente' },
    { type: 'ESCRITURA', label: 'Escritura de Propiedad', description: 'Para acreditar la titularidad' },
    { type: 'IBI', label: 'Último recibo IBI', description: 'Pagado y al corriente' },
    { type: 'CEDULA_HABITABILIDAD', label: 'Cédula de Habitabilidad', description: 'Vigente y válida' },
    { type: 'CERTIFICADO_ENERGETICO', label: 'Certificado Energético', description: 'Obligatorio para alquilar' },
    { type: 'DEUDAS_COMUNIDAD', label: 'Certificado sin Deudas', description: 'Emitido por administrador' },
    { type: 'CUENTA_BANCARIA', label: 'Cuenta Bancaria Domiciliación', description: 'Para cobro mensual de la renta' },
    { type: 'DNI_INQUILINO', label: 'DNI / NIE Inquilino', description: 'Del candidato seleccionado' },
    { type: 'NOMINAS_INQUILINO', label: 'Nóminas Inquilino (x3)', description: 'Últimas 3 nóminas' },
    { type: 'CONTRATO_INQUILINO', label: 'Contrato Trabajo Inquilino', description: 'Vigente' },
    { type: 'DNI_AVALISTA', label: 'DNI y Nóminas Avalista', description: 'Si se requiere garante' },
  ],
  INVERSION: [
    { type: 'DNI_PASAPORTE', label: 'DNI / Pasaporte Inversor', description: 'Del representante legal, vigente' },
    { type: 'DOC_SOCIETARIA', label: 'Documentación Societaria', description: 'Poderes de representación completos' },
    { type: 'CIF_EMPRESA', label: 'CIF Empresa', description: 'Si la inversión es societaria' },
    { type: 'ESCRITURA', label: 'Escrituras Inmueble/Portfolio', description: 'De cada activo del paquete' },
    { type: 'NOTA_SIMPLE', label: 'Nota Simple de cada activo', description: 'Menos de 6 meses' },
    { type: 'DUE_DILIGENCE', label: 'Informe Due Diligence', description: 'Auditoría técnica y legal' },
    { type: 'TASACION_OFICIAL', label: 'Tasación Oficial', description: 'Menos de 6 meses' },
    { type: 'PLAN_NEGOCIO', label: 'Plan de Negocio / Memoria', description: 'Inversión proyectada' },
    { type: 'CARGAS_GRAVAMENES', label: 'Certificado Cargas y Gravámenes', description: 'De cada activo' },
    { type: 'RENTABILIDAD', label: 'Informe Rentabilidad Proyectada', description: 'Análisis financiero' },
    { type: 'LICENCIAS_ACTIVIDAD', label: 'Licencias de Actividad', description: 'Si aplica al uso' },
    { type: 'CERT_NO_CONCURSO', label: 'Certificado No Concurso', description: 'Del vendedor/sociedad' },
  ],
  INQUILINO: [
    { type: 'DNI_NIE', label: 'DNI / NIE Inquilino', description: 'Documento vigente del inquilino' },
    { type: 'DNI_NIE_CONYUGE', label: 'DNI / NIE Pareja / Cotitular', description: 'Si alquilan conjuntamente' },
    { type: 'NOMINAS', label: 'Últimas 3 Nóminas', description: 'Justificante de ingresos mensuales' },
    { type: 'CONTRATO_TRABAJO', label: 'Contrato de Trabajo Vigente', description: 'Acreditar estabilidad laboral' },
    { type: 'VIDA_LABORAL', label: 'Vida Laboral Actualizada', description: 'Del Servicio Público de Empleo' },
    { type: 'IRPF', label: 'Declaración IRPF', description: 'Último ejercicio presentado' },
    { type: 'EXTRACTOS_BANCO', label: 'Extractos Bancarios 3 meses', description: 'Últimos 3 meses de movimientos' },
    { type: 'REFERENCIAS_ANTERIORES', label: 'Referencias Arrendador Anterior', description: 'Carta o contacto del antiguo casero' },
    { type: 'CERTIFICADO_SOLVENCIA', label: 'Certificado de Solvencia', description: 'Informe ASNEF/Experian sin incidencias' },
    { type: 'DNI_AVALISTA', label: 'DNI / NIE Avalista', description: 'Si se requiere garante' },
    { type: 'NOMINAS_AVALISTA', label: 'Nóminas Avalista (x3)', description: 'Últimas 3 nóminas del garante' },
    { type: 'ESCRITURA_AVALISTA', label: 'Escritura Propiedad Avalista', description: 'Si ofrece garantía real' },
    { type: 'SEGURO_IMPAGO', label: 'Seguro de Impago Alquiler', description: 'Si lo requiere el propietario' },
    { type: 'CUENTA_BANCARIA', label: 'Cuenta Bancaria Domiciliación', description: 'Para el pago mensual de la renta' },
  ],
  PROPIETARIO: [
    { type: 'DNI_NIE_CIF', label: 'DNI / NIE / CIF Propietario', description: 'Documento de identidad del titular' },
    { type: 'ESCRITURA_PROPIEDAD', label: 'Escritura de Propiedad', description: 'Título que acredita la titularidad' },
    { type: 'IBI_RECIBO', label: 'Último recibo IBI', description: 'Impuesto de Bienes Inmuebles' },
    { type: 'CEE', label: 'Certificado Eficiencia Energética', description: 'Obligatorio para alquilar (vigente)' },
    { type: 'CEDULA_HABITABILIDAD', label: 'Cédula de Habitabilidad', description: 'Vigente y válida' },
    { type: 'PLANOS_INMUEBLE', label: 'Planos del Inmueble', description: 'Para marketing y contrato' },
    { type: 'RECIBO_SUMINISTROS', label: 'Últimos recibos Agua/Luz/Gas', description: 'Para cambio de titularidad/domiciliación' },
    { type: 'INVENTARIO_MUEBLES', label: 'Inventario y Fotos Contenido', description: 'Detalle de mobiliario y estado' },
    { type: 'MANDATO_ALQUILER', label: 'Mandato de Alquiler / Exclusiva', description: 'Contrato con la agencia' },
    { type: 'ACTA_ENTREGA_LLAVES', label: 'Resguardo de llaves', description: 'Firmado al entregar las llaves a la agencia' },
    { type: 'CERT_COMUNIDAD', label: 'Certificado estar al corriente Comunidad', description: 'Firmado por el administrador' },
  ],
  INVERSION_HOLDERS: [
    { type: 'DNI_CIF', label: 'DNI / CIF del Inversor', description: 'Identificación fiscal' },
    { type: 'POF', label: 'Proof of Funds (Prueba de fondos)', description: 'Extracto o certificado bancario reciente' },
    { type: 'CONTRATO_SERVICIO', label: 'Contrato de Búsqueda y Gestión', description: 'Acuerdo firmado con la agencia' },
    { type: 'KYC_FORM', label: 'Formulario KYC / Blanqueo', description: 'Cumplimiento normativo PBC' },
    { type: 'DOSSIER_REQUERIMIENTOS', label: 'Dossier de Inversión', description: 'Criterios detallados del inversor' },
    { type: 'ESTUDIO_VIABILIDAD', label: 'Estudio de Viabilidad', description: 'Análisis financiero del activo seleccionado' },
    { type: 'CONTRATO_ARRAS', label: 'Contrato de Arras / Reserva', description: 'Documento firmado de reserva de activo' },
    { type: 'ESCRITURA_COMPRA', label: 'Escritura de Compraventa', description: 'Copia simple de la adquisición' },
  ]
}

export default function DocumentPanel({ expedientId, currentPhase, operationType }) {
  const qc = useQueryClient()
  const fileRef = useRef()
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState('OTRO')
  const [docName, setDocName] = useState('')
  const [selectedNeeded, setSelectedNeeded] = useState(null)
  const [expandedDoc, setExpandedDoc] = useState(null)

  const { data: documents, isLoading: docLoading } = useQuery({
    queryKey: ['documents', expedientId],
    queryFn: () => api.get(`/documents/expedient/${expedientId}`).then(r => r.data),
  })

  const { data: checklists, isLoading: checkLoading } = useQuery({
    queryKey: ['checklists', expedientId],
    queryFn: () => api.get(`/checklists/expedient/${expedientId}`).then(r => r.data),
  })

  const currentChecklist = checklists?.find(c => c.phase === currentPhase)
  const neededDocs = REQUIRED_DOCS[operationType] || []

  // Mapeo de documentos subidos por tipo
  const uploadedTypes = (documents || []).reduce((acc, doc) => {
    acc[doc.docType] = true
    return acc
  }, {})

  // Mapeo de ítems del checklist para ver cuáles ya están ahí
  const checklistLabels = (currentChecklist?.items || []).map(i => i.label.toLowerCase())

  const addItemToChecklist = useMutation({
    mutationFn: (label) => api.post(`/checklists/instance/${currentChecklist.id}/items`, { label, required: true }),
    onSuccess: () => {
      toast.success('Añadido al checklist')
      qc.invalidateQueries(['checklists', expedientId])
      qc.invalidateQueries(['expedient', expedientId])
    }
  })

  const syncAllToChecklist = () => {
    if (!currentChecklist) return toast.error('No hay checklist activo en esta fase')
    const toAdd = neededDocs.filter(doc => !uploadedTypes[doc.type] && !checklistLabels.includes(doc.label.toLowerCase()))
    if (toAdd.length === 0) return toast.success('Ya están todos en el checklist')
    
    Promise.all(toAdd.map(doc => addItemToChecklist.mutateAsync(doc.label)))
      .then(() => toast.success('Requisitos sincronizados'))
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    // Si venimos de un placeholder "Necesario", usamos ese tipo
    const finalType = selectedNeeded ? selectedNeeded.type : docType
    const finalName = selectedNeeded ? selectedNeeded.label : (docName || file.name)

    formData.append('docType', finalType)
    formData.append('name', finalName)
    formData.append('phase', currentPhase)

    try {
      await api.post(`/documents/expedient/${expedientId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Documento subido correctamente')
      qc.invalidateQueries(['documents', expedientId])
      setDocName('')
      setSelectedNeeded(null)
    } catch {
      toast.error('Error al subir el documento')
    } finally {
      setUploading(false)
      fileRef.current.value = ''
    }
  }

  const validateMutation = useMutation({
    mutationFn: (docId) => api.put(`/documents/${docId}/validate`),
    onSuccess: () => { toast.success('Documento validado'); qc.invalidateQueries(['documents', expedientId]) },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ docId, reason }) => api.put(`/documents/${docId}/reject`, { rejectedReason: reason }),
    onSuccess: () => { toast.success('Documento rechazado'); qc.invalidateQueries(['documents', expedientId]) },
  })

  const deleteMutation = useMutation({
    mutationFn: (docId) => api.delete(`/documents/${docId}`),
    onSuccess: () => qc.invalidateQueries(['documents', expedientId]),
  })

  if (docLoading || checkLoading) return <div className="text-gray-400 text-center py-10">Cargando documentos...</div>

  // Documentos subidos agrupados
  const grouped = (documents || []).reduce((acc, doc) => {
    const key = doc.docType || 'OTRO'
    acc[key] = acc[key] || []
    acc[key].push(doc)
    return acc
  }, {})

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Columna Izquierda: Documentación Necesaria */}
      <div className="lg:col-span-1 space-y-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Info className="text-blue-500" size={18} />
              <h4 className="font-semibold text-[var(--text-main)] text-sm">Documentación Necesaria</h4>
            </div>
            {currentChecklist && (
              <button 
                onClick={syncAllToChecklist}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                title="Añadir requisitos pendientes al checklist de esta fase"
              >
                <Plus size={12} /> Sincronizar
              </button>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mb-4 bg-[var(--bg-color)] p-2 rounded italic">
            Basado en un flujo de <strong className="text-blue-600">{operationType}</strong>
          </p>

          <div className="space-y-2">
            {neededDocs.map(doc => {
              const isUploaded = uploadedTypes[doc.type]
              return (
                <div key={doc.type}
                  className={`p-3 rounded-xl border transition-all ${isUploaded ? 'bg-[var(--sidebar-bg)] border-green-100' : 'bg-[var(--card-bg)] border-[var(--border-color)]'
                    }`}
                >
                    <div className="flex items-center gap-2">
                      {isUploaded ? (
                        <CheckCircle size={14} className="text-green-500" />
                      ) : (
                        <AlertCircle size={14} className="text-gray-300" />
                      )}
                      <span className={`text-xs font-bold ${isUploaded ? 'text-green-700' : 'text-[var(--text-muted)]'}`}>
                        {doc.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isUploaded && !checklistLabels.includes(doc.label.toLowerCase()) && (
                        <button 
                          onClick={() => addItemToChecklist.mutate(doc.label)}
                          className="p-1 hover:text-blue-600 text-gray-400 transition-colors"
                          title="Añadir tarea al checklist"
                        >
                          <Plus size={14} />
                        </button>
                      )}
                      {!isUploaded && (
                        <button
                          onClick={() => {
                            setSelectedNeeded(doc)
                            fileRef.current?.click()
                          }}
                          className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                        >
                          Subir
                        </button>
                      )}
                    </div>
                  <p className="text-[10px] text-gray-500 mt-1 pl-5">{doc.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Columna Derecha: Gestor de Archivos */}
      <div className="lg:col-span-2 space-y-4">

        {/* Upload zone */}
        <div className="card p-5">
          <h4 className="font-semibold mb-3 text-[var(--text-main)] text-sm">Subir otro documento</h4>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-40">
              <label className="label text-xs">Nombre descriptivo</label>
              <input
                type="text" className="input text-sm py-1.5" placeholder="Ej: Nota simple ayer"
                value={docName} onChange={e => setDocName(e.target.value)}
              />
            </div>
            <div>
              <label className="label text-xs">Tipo</label>
              <select className="select text-sm py-1" value={docType} onChange={e => setDocType(e.target.value)}>
                <option value="OTRO">OTRO</option>
                {neededDocs.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
                <option value="NOMINAS">NOMINAS</option>
                <option value="CONTRATO">CONTRATO</option>
                <option value="ARRAS">ARRAS</option>
              </select>
            </div>
            <button
              className="btn-primary"
              onClick={() => {
                setSelectedNeeded(null)
                fileRef.current?.click()
              }}
              disabled={uploading}
            >
              <Upload size={15} />
              {uploading ? 'Subiendo...' : 'Subir'}
            </button>
            <input ref={fileRef} type="file" className="hidden" onChange={handleUpload}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" />
          </div>
        </div>

        {/* Document list agrupado */}
        <div className="space-y-3">
          {Object.entries(grouped).map(([type, docs]) => (
            <div key={type} className="card overflow-hidden">
              <div className="px-5 py-2 bg-[var(--bg-color)]/50 border-b border-[var(--border-color)] flex justify-between items-center">
                <h5 className="font-bold text-[10px] text-gray-400 uppercase tracking-wider">
                  {type.replace(/_/g, ' ')}
                </h5>
                <span className="text-[10px] text-gray-400 bg-[var(--card-bg)] px-2 py-0.5 rounded-full border">
                  {docs.length} {docs.length === 1 ? 'archivo' : 'archivos'}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {docs.map(doc => {
                  const cfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.PENDIENTE
                  const Icon = cfg.icon

                  return (
                    <div key={doc.id} id={`doc-${doc.id}`} className="px-5 py-3 hover:bg-[var(--bg-color)]/30 transition-colors">
                      {/* Fila principal */}
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-main)] truncate">{doc.name}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className={`text-[10px] font-bold ${cfg.color.split(' ')[0]}`}>{cfg.label}</span>
                            <span className="text-[10px] text-gray-400 capitalize">{doc.phase.toLowerCase()}</span>
                            {doc.rejectedReason && (
                              <span className="text-[10px] text-red-500 font-medium">Motivo: {doc.rejectedReason}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Historial de validaciones */}
                          <button
                            onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                            className={`p-1.5 rounded-lg hover:bg-[var(--sidebar-bg)] transition-all ${expandedDoc === doc.id ? 'text-[var(--primary-color)]' : 'text-gray-400 hover:text-[var(--primary-color)]'}`}
                            title="Historial de validaciones"
                          >
                            <History size={15} />
                          </button>
                          <button
                            onClick={() => {
                              const token = localStorage.getItem('crm_token');
                              window.open(`/api/documents/${doc.id}/preview?token=${token}`, '_blank');
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-[var(--sidebar-bg)] transition-all"
                            title="Ver documento"
                          >
                            <Eye size={15} />
                          </button>
                          {doc.driveUrl && (
                            <a href={doc.driveUrl} target="_blank" rel="noreferrer"
                              className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-[var(--sidebar-bg)] transition-all"
                              title="Ver en Google Drive"
                            >
                              <ExternalLink size={15} />
                            </a>
                          )}
                          <a
                            href={`/api/documents/${doc.id}/download?token=${localStorage.getItem('crm_token')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-[var(--sidebar-bg)] transition-all"
                            title="Descargar"
                          >
                            <Download size={15} />
                          </a>
                          {doc.status === 'SUBIDO' && (
                            <>
                              <button onClick={() => validateMutation.mutate(doc.id)}
                                className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-[var(--sidebar-bg)] transition-all"
                                title="Validar"
                              >
                                <CheckCircle size={15} />
                              </button>
                              <button onClick={() => {
                                const reason = prompt('Motivo del rechazo:')
                                if (reason) rejectMutation.mutate({ docId: doc.id, reason })
                              }}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-[var(--sidebar-bg)] transition-all"
                                title="Rechazar"
                              >
                                <XCircle size={15} />
                              </button>
                            </>
                          )}
                          <button onClick={() => {
                            if (confirm('¿Eliminar este documento?')) deleteMutation.mutate(doc.id)
                          }}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-[var(--sidebar-bg)] transition-all"
                            title="Eliminar"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                      {/* Panel de historial de validaciones */}
                      {expandedDoc === doc.id && (
                        <DocumentValidationHistory
                          docId={doc.id}
                          onClose={() => setExpandedDoc(null)}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {(documents || []).length === 0 && (
            <div className="card p-12 text-center border-dashed border-2 border-[var(--border-color)]">
              <FileText size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-medium">Gestor de archivos vacío</p>
              <p className="text-[10px] text-gray-300 mt-1">Usa la columna de la izquierda para subir la documentación necesaria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
