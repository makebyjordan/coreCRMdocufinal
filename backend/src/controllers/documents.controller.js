const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const driveService = require('../services/drive.service');
const notificationEngine = require('../services/notification.engine');
const activityFeed = require('../services/activity-feed.service');
const logger = require('../config/logger');

async function listByExpedient(req, res) {
  try {
    const { phase } = req.query;
    const where = {
      expedientId: req.params.expedientId,
      ...(phase && { phase }),
    };
    const documents = await prisma.document.findMany({
      where,
      include: { uploadedBy: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(documents);
  } catch (err) {
    logger.error('[Documents] Error al listar:', err.message);
    res.status(500).json({ error: 'Error al obtener documentos' });
  }
}

async function upload(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se proporcionó ningún archivo' });

    const { expedientId } = req.params;
    const { docType, phase, name } = req.body;

    const expedient = await prisma.expedient.findUnique({ where: { id: expedientId } });
    if (!expedient) return res.status(404).json({ error: 'Expediente no encontrado' });

    let driveFileId = null;
    let driveUrl = null;

    try {
      const driveFile = await driveService.uploadFile(
        expedient.driveFolderId,
        req.file.path,
        name || req.file.originalname,
        req.file.mimetype
      );
      if (driveFile) {
        driveFileId = driveFile.id;
        driveUrl = driveFile.webViewLink;
      }
    } catch (err) {
      logger.warn('No se pudo subir a Drive:', err.message);
    }

    const doc = await prisma.document.create({
      data: {
        expedientId,
        ownerClientId: expedient.clientId, // Vincular al cliente del expediente
        uploadedById: req.user.id,
        name: name || req.file.originalname,
        docType: docType || 'OTRO',
        phase: phase || expedient.currentPhase,
        status: 'PENDIENTE',
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        driveFileId,
        driveUrl,
      },
      include: { uploadedBy: { select: { name: true, role: true } } },
    });

    // ─── ACTIVITY FEED (post-commit, silencioso) ─────────────
    try {
      activityFeed.recordActivity({
        type: activityFeed.ACTIVITY_TYPES.DOC_UPLOADED,
        title: `Documento subido: ${doc.name}`,
        description: `Tipo: ${doc.docType}, Fase: ${doc.phase}`,
        clientId: expedient.clientId,
        expedientId,
        userId: req.user?.id,
        relatedEntityType: 'Document',
        relatedEntityId: doc.id,
        metadata: { docType, phase: doc.phase, fileSize: req.file.size },
      }).catch(() => {});
    } catch (_) {}

    res.status(201).json(doc);
  } catch (err) {
    logger.error('[Documents] Error al subir:', err.message);
    res.status(500).json({ error: 'Error al subir el documento' });
  }
}

async function validate(req, res) {
  try {
    const { notes } = req.body;

    // Obtener documento antes de actualizar para tener contexto
    const existing = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: { expedient: { select: { id: true, code: true, clientId: true } } },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    const doc = await prisma.document.update({
      where: { id: req.params.id },
      data: { status: 'VALIDADO', notes, validatedAt: new Date() },
    });

    // ─── ACTIVITY FEED (post-commit, silencioso) ─────────────
    try {
      activityFeed.recordActivity({
        type: activityFeed.ACTIVITY_TYPES.DOC_VALIDATED,
        title: `Documento validado: ${existing.name}`,
        description: notes,
        clientId: existing.expedient?.clientId,
        expedientId: existing.expedientId,
        userId: req.user?.id,
        relatedEntityType: 'Document',
        relatedEntityId: doc.id,
      }).catch(() => {});
    } catch (_) {}

    res.json(doc);
  } catch (err) {
    logger.error('[Documents] Error al validar:', err.message);
    res.status(500).json({ error: 'Error al validar el documento' });
  }
}

async function reject(req, res) {
  try {
    const { rejectedReason } = req.body;

    // Obtener documento antes de actualizar
    const existing = await prisma.document.findUnique({
      where: { id: req.params.id },
      include: { expedient: { select: { id: true, code: true, clientId: true } } },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    const doc = await prisma.document.update({
      where: { id: req.params.id },
      data: { status: 'RECHAZADO', rejectedReason },
    });

    await notificationEngine.onDocumentRejected(doc.expedientId, doc.name, rejectedReason);

    // ─── ACTIVITY FEED (post-commit, silencioso) ─────────────
    try {
      activityFeed.recordActivity({
        type: activityFeed.ACTIVITY_TYPES.DOC_REJECTED,
        title: `Documento rechazado: ${existing.name}`,
        description: rejectedReason,
        clientId: existing.expedient?.clientId,
        expedientId: existing.expedientId,
        userId: req.user?.id,
        relatedEntityType: 'Document',
        relatedEntityId: doc.id,
        metadata: { rejectedReason },
      }).catch(() => {});
    } catch (_) {}

    res.json(doc);
  } catch (err) {
    logger.error('[Documents] Error al rechazar:', err.message);
    res.status(500).json({ error: 'Error al rechazar el documento' });
  }
}

async function remove(req, res) {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });

    if (doc.filePath && fs.existsSync(doc.filePath)) {
      fs.unlinkSync(doc.filePath);
    }

    await prisma.document.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    logger.error('[Documents] Error al eliminar:', err.message);
    res.status(500).json({ error: 'Error al eliminar el documento' });
  }
}

async function download(req, res) {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });

    if (doc.filePath && fs.existsSync(doc.filePath)) {
      const absolutePath = path.resolve(doc.filePath);
      const ext = path.extname(doc.filePath);
      const safeName = doc.name.endsWith(ext) ? doc.name : `${doc.name}${ext}`;
      
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeName)}"`);
      if (doc.mimeType) res.setHeader('Content-Type', doc.mimeType);
      return res.sendFile(absolutePath);
    } else if (doc.driveUrl) {
      return res.redirect(doc.driveUrl);
    }

    res.status(404).json({ error: 'Archivo no disponible' });
  } catch (err) {
    logger.error('[Documents] Error al descargar:', err.message);
    res.status(500).json({ error: 'Error al descargar el documento' });
  }
}

async function preview(req, res) {
  const { id } = req.params;
  try {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });

    if (!doc.filePath || !fs.existsSync(doc.filePath)) {
      if (doc.driveUrl) return res.redirect(doc.driveUrl);
      return res.status(404).json({ error: 'Archivo no disponible' });
    }

    const absolutePath = path.resolve(doc.filePath);
    const mime = doc.mimeType || '';

    // PDFs e imágenes: el navegador los renderiza nativamente
    if (mime === 'application/pdf' || mime.startsWith('image/')) {
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', 'inline');
      return res.sendFile(absolutePath);
    }

    // DOCX: convertir a HTML con mammoth
    if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.convertToHtml({ path: absolutePath });
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>body{font-family:system-ui,-apple-system,sans-serif;line-height:1.6;padding:40px;max-width:800px;margin:0 auto;background:#fff;color:#333;} h1,h2{color:#1a365d;} table{border-collapse:collapse;width:100%;margin:20px 0;} th,td{border:1px solid #e2e8f0;padding:12px;text-align:left;} th{background:#f7fafc;}</style>
        </head><body>${result.value}</body></html>`;
      return res.send(html);
    }

    return res.send(`<!DOCTYPE html><html><body>Vista previa no disponible. Formato: ${mime}</body></html>`);

  } catch (err) {
    logger.error('[Documents] Error en preview:', err);
    res.status(500).json({ error: 'Error al generar vista previa' });
  }
}

module.exports = { listByExpedient, upload, validate, reject, remove, download, preview };
