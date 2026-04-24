import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

const SCORE_LABELS = {
  FRIO: 'Frío',
  TIBIO: 'Tibio',
  CALIENTE: 'Caliente',
  HOT: 'Hot',
}

const STAGE_LABELS = {
  LEAD: 'Lead',
  PROSPECTO: 'Prospecto',
  ACTIVO: 'Activo',
  RECURRENTE: 'Recurrente',
  PERDIDO: 'Perdido',
}

export function exportClientToPDF(client, stats, expedients, notes, tasks, relations) {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  let y = 20

  // Header
  doc.setFontSize(22)
  doc.setTextColor(31, 41, 55)
  doc.text('Ficha Cliente 360', margin, y)
  
  y += 10
  doc.setFontSize(10)
  doc.setTextColor(107, 114, 128)
  doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, margin, y)
  
  y += 15

  // Info principal
  const fullName = client.firstName
    ? `${client.firstName} ${client.lastName || ''}`.trim()
    : client.companyName || 'Sin nombre'

  doc.setFontSize(16)
  doc.setTextColor(31, 41, 55)
  doc.text(fullName, margin, y)
  
  y += 8
  doc.setFontSize(10)
  doc.setTextColor(107, 114, 128)
  doc.text(`DNI: ${client.dni || 'No registrado'} | Tipo: ${client.type}`, margin, y)
  
  y += 12

  // Contacto
  doc.setFontSize(12)
  doc.setTextColor(31, 41, 55)
  doc.text('Información de Contacto', margin, y)
  
  y += 8
  doc.setFontSize(10)
  doc.setTextColor(55, 65, 81)
  
  const contactInfo = [
    ['Email:', client.email || '—'],
    ['Teléfono:', client.phone || '—'],
    ['Teléfono 2:', client.phone2 || '—'],
    ['Dirección:', client.address ? `${client.address}${client.city ? ', ' + client.city : ''}${client.postalCode ? ' ' + client.postalCode : ''}` : '—'],
    ['NIF:', client.nif || '—'],
    ['Fecha nacimiento:', client.birthDate ? new Date(client.birthDate).toLocaleDateString('es-ES') : '—'],
  ]

  contactInfo.forEach(([label, value]) => {
    doc.setFont(undefined, 'bold')
    doc.text(label, margin, y)
    doc.setFont(undefined, 'normal')
    doc.text(value, margin + 35, y)
    y += 6
  })

  y += 8

  // Métricas
  doc.setFontSize(12)
  doc.setTextColor(31, 41, 55)
  doc.text('Métricas', margin, y)
  
  y += 8
  doc.setFontSize(10)
  
  const metrics = [
    ['Score:', SCORE_LABELS[client.score] || client.score || '—'],
    ['Etapa:', STAGE_LABELS[client.lifecycleStage] || client.lifecycleStage || '—'],
    ['Total expedientes:', String(stats?.totalExpedients || 0)],
    ['Activos:', String(stats?.activeExpedients || 0)],
    ['Cerrados:', String(stats?.closedExpedients || 0)],
    ['Días sin contacto:', stats?.daysSinceLastContact !== null ? String(stats.daysSinceLastContact) : '—'],
  ]

  metrics.forEach(([label, value]) => {
    doc.setFont(undefined, 'bold')
    doc.text(label, margin, y)
    doc.setFont(undefined, 'normal')
    doc.text(value, margin + 35, y)
    y += 6
  })

  // Etiquetas
  if (client.tags && client.tags.length > 0) {
    y += 4
    doc.setFont(undefined, 'bold')
    doc.text('Etiquetas:', margin, y)
    doc.setFont(undefined, 'normal')
    doc.text(client.tags.join(', '), margin + 35, y)
  }

  y += 15

  // Expedientes
  if (expedients && expedients.length > 0) {
    // Nueva página si es necesario
    if (y > 250) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(12)
    doc.setTextColor(31, 41, 55)
    doc.text('Expedientes', margin, y)
    y += 10

    const expedientData = expedients.map(exp => [
      exp.code,
      exp.operationType,
      exp.clientRole || 'CLIENTE',
      exp.status,
      exp.propertyPrice ? `${Number(exp.propertyPrice).toLocaleString('es-ES')} €` : '—',
    ])

    doc.autoTable({
      startY: y,
      head: [['Código', 'Tipo', 'Rol', 'Estado', 'Precio']],
      body: expedientData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    })

    y = doc.lastAutoTable.finalY + 15
  }

  // Notas
  if (notes && notes.length > 0) {
    if (y > 220) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(12)
    doc.setTextColor(31, 41, 55)
    doc.text(`Notas (${notes.length})`, margin, y)
    y += 10

    notes.slice(0, 10).forEach((note, idx) => {
      if (y > 270) {
        doc.addPage()
        y = 20
      }

      doc.setFontSize(9)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(107, 114, 128)
      doc.text(`${new Date(note.createdAt).toLocaleDateString('es-ES')} - ${note.author?.name || 'Usuario'}${note.pinned ? ' (Fijada)' : ''}`, margin, y)
      
      y += 5
      doc.setFont(undefined, 'normal')
      doc.setTextColor(55, 65, 81)
      
      // Wrap text
      const splitText = doc.splitTextToSize(note.content, pageWidth - margin * 2)
      doc.text(splitText, margin, y)
      y += splitText.length * 4 + 6
    })
  }

  // Tareas pendientes
  if (tasks && tasks.length > 0) {
    const pendingTasks = tasks.filter(t => !t.completedAt)
    if (pendingTasks.length > 0) {
      if (y > 250) {
        doc.addPage()
        y = 20
      }

      doc.setFontSize(12)
      doc.setTextColor(31, 41, 55)
      doc.text(`Tareas pendientes (${pendingTasks.length})`, margin, y)
      y += 10

      const taskData = pendingTasks.slice(0, 15).map(task => [
        task.title,
        task.type,
        task.priority,
        task.dueDate ? new Date(task.dueDate).toLocaleDateString('es-ES') : '—',
      ])

      doc.autoTable({
        startY: y,
        head: [['Título', 'Tipo', 'Prioridad', 'Vencimiento']],
        body: taskData,
        theme: 'striped',
        headStyles: { fillColor: [245, 158, 11] },
        styles: { fontSize: 9 },
        margin: { left: margin, right: margin },
      })
    }
  }

  // Relaciones
  if (relations && relations.length > 0) {
    if (y > 250) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(12)
    doc.setTextColor(31, 41, 55)
    doc.text(`Relaciones (${relations.length})`, margin, y)
    y += 10

    const relationData = relations.map(rel => {
      const other = rel.otherClient
      const name = other.firstName
        ? `${other.firstName} ${other.lastName || ''}`.trim()
        : other.companyName
      return [
        name,
        rel.type,
        other.email,
      ]
    })

    doc.autoTable({
      startY: y,
      head: [['Nombre', 'Tipo relación', 'Email']],
      body: relationData,
      theme: 'striped',
      headStyles: { fillColor: [139, 92, 246] },
      styles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    })
  }

  // Footer
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(156, 163, 175)
    doc.text(
      `CRM Cliente 360 - Página ${i} de ${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }

  // Guardar
  const fileName = `ficha-cliente-${client.dni || client.id}-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}
