const { prisma } = require('../config/db');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');

/**
 * GET /api/reports/client/:clientId
 * Get consolidated client report data
 */
async function getClientReport(req, res) {
  try {
    const { clientId } = req.params;

    // Get client data
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Build client name from firstName/lastName or companyName
    const clientName = client.companyName || `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Sin nombre';

    // Get expedients (direct clientId OR participant via ExpedientClient)
    const [directExpedients, participantLinks] = await Promise.all([
      prisma.expedient.findMany({
        where: { clientId },
        include: {
          assignments: { include: { user: true } },
        },
      }),
      prisma.expedientClient.findMany({
        where: { clientId },
        include: {
          expedient: {
            include: { assignments: { include: { user: true } } },
          },
        },
      }),
    ]);

    // Merge and deduplicate expedients
    const participantExpedients = participantLinks.map(l => l.expedient).filter(e => e);
    const allExpedientIds = new Set(directExpedients.map(e => e.id));
    const mergedExpedients = [...directExpedients];
    participantExpedients.forEach(e => {
      if (!allExpedientIds.has(e.id)) {
        mergedExpedients.push(e);
        allExpedientIds.add(e.id);
      }
    });
    const expedients = mergedExpedients;

    // Get commissions
    const commissions = await prisma.commission.findMany({
      where: {
        OR: [
          { expedient: { clientId } },
          { expedient: { clientRoles: { some: { clientId } } } },
        ],
      },
      include: { expedient: true },
    }).catch(() => []);

    // Get activity log
    const activities = await prisma.detailedActivityLog.findMany({
      where: { clientId },
      orderBy: { timestamp: 'desc' },
      take: 100,
    }).catch(() => []);

    // Calculate totals
    const totalCommissions = commissions.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    const totalExpedients = expedients.length;
    const closedExpedients = expedients.filter(e => e.status === 'COMPLETADO' || e.currentPhase === 'ACUERDO').length;

    res.json({
      client: {
        ...client,
        name: clientName, // Add constructed name
      },
      expedients,
      commissions,
      activities,
      summary: {
        totalExpedients,
        closedExpedients,
        pendingExpedients: totalExpedients - closedExpedients,
        totalCommissions,
        averageCommission: totalCommissions / (totalExpedients || 1),
      },
    });
  } catch (error) {
    console.error('[Reports Controller] Error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/reports/client/:clientId/pdf
 * Download client report as PDF
 */
async function getClientReportPDF(req, res) {
  try {
    const { clientId } = req.params;

    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Build client name from firstName/lastName or companyName
    const clientName = client.companyName || `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Sin nombre';

    const expedients = await prisma.expedient.findMany({
      where: { clientId },
    });

    const commissions = await prisma.commission.findMany({
      where: { expedient: { clientId } },
    }).catch(() => []);

    // Create PDF
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-${clientName}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('REPORTE DE CLIENTE', { align: 'center' });
    doc.fontSize(10).text('DocuInmo - Gestión Documental Inmobiliaria', { align: 'center' });
    doc.moveDown();

    // Client Info
    doc.fontSize(12).font('Helvetica-Bold').text('INFORMACIÓN DEL CLIENTE');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Nombre: ${clientName}`);
    doc.text(`DNI/NIF: ${client.dni || client.nif || 'N/A'}`);
    doc.text(`Email: ${client.email || 'N/A'}`);
    doc.text(`Teléfono: ${client.phone || 'N/A'}`);
    doc.text(`Fuente: ${client.source || 'N/A'}`);
    doc.moveDown();

    // Expedients Summary
    doc.fontSize(12).font('Helvetica-Bold').text('EXPEDIENTES');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total: ${expedients.length}`);
    doc.text(`Cerrados: ${expedients.filter(e => e.status === 'COMPLETADO' || e.currentPhase === 'ACUERDO').length}`);
    doc.text(`En proceso: ${expedients.filter(e => e.status !== 'COMPLETADO' && e.currentPhase !== 'ACUERDO').length}`);
    doc.moveDown();

    // Expedient Details
    expedients.forEach((exp, i) => {
      doc.fontSize(9).font('Helvetica-Bold').text(`${i + 1}. ${exp.code}`);
      doc.fontSize(9).font('Helvetica').text(`Fase: ${exp.currentPhase || 'N/A'}`);
      doc.text(`Propiedad: ${exp.propertyAddress || 'N/A'}`);
    });
    doc.moveDown();

    // Commissions
    doc.fontSize(12).font('Helvetica-Bold').text('COMISIONES');
    const totalComm = commissions.reduce((sum, c) => sum + (c.amount || 0), 0);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total: €${totalComm.toFixed(2)}`);
    doc.text(`Promedio por expediente: €${(totalComm / (expedients.length || 1)).toFixed(2)}`);

    doc.end();
  } catch (error) {
    console.error('[Reports Controller PDF] Error:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/reports/client/:clientId/excel
 * Download client report as Excel
 */
async function getClientReportExcel(req, res) {
  try {
    const { clientId } = req.params;

    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    // Build client name from firstName/lastName or companyName
    const clientName = client.companyName || `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Sin nombre';

    const expedients = await prisma.expedient.findMany({
      where: { clientId },
    });

    const commissions = await prisma.commission.findMany({
      where: { expedient: { clientId } },
    });

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      ['REPORTE DE CLIENTE', clientName],
      ['Fecha', new Date().toLocaleDateString('es-ES')],
      [],
      ['INFORMACIÓN DEL CLIENTE'],
      ['Nombre', clientName],
      ['DNI/NIF', client.dni || client.nif || 'N/A'],
      ['Email', client.email || 'N/A'],
      ['Teléfono', client.phone || 'N/A'],
      [],
      ['RESUMEN'],
      ['Total Expedientes', expedients.length],
      ['Expedientes Cerrados', expedients.filter(e => e.phase === 'ACUERDO').length],
      ['Total Comisiones', `€${commissions.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0).toFixed(2)}`],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');

    // Sheet 2: Expedients
    const expData = [
      ['Código', 'Tipo', 'Fase', 'Estado', 'Dirección', 'Fecha Creación'],
      ...expedients.map(e => [
        e.code,
        e.operationType || 'N/A',
        e.currentPhase || 'N/A',
        e.status || 'N/A',
        e.propertyAddress || 'N/A',
        new Date(e.createdAt).toLocaleDateString('es-ES'),
      ]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(expData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Expedientes');

    // Sheet 3: Commissions
    const commData = [
      ['Expediente', 'Cantidad', 'Porcentaje', 'Facturado', 'Pagado'],
      ...commissions.map(c => [
        c.expedient?.code || 'N/A',
        `€${c.amount?.toFixed(2) || '0'}`,
        `${c.percentage || '0'}%`,
        c.invoiced ? 'Sí' : 'No',
        c.paid ? 'Sí' : 'No',
      ]),
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(commData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Comisiones');

    // Send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-${clientName}.xlsx"`);
    res.send(XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }));
  } catch (error) {
    console.error('[Reports Controller Excel] Error:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getClientReport,
  getClientReportPDF,
  getClientReportExcel,
};
