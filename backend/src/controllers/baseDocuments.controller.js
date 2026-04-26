const { prisma } = require('../config/db');
const driveService = require('../services/drive.service');
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const logger = require('../config/logger');
const templateEngine = require('../services/template-engine.service');

async function list(req, res) {
  try {
    const { filter, category } = req.query;
    
    const where = {
      ...(category && { category }),
      ...(filter === 'templates' && { isTemplate: true }),
      ...(filter === 'files' && { isTemplate: false }),
    };
    
    const docs = await prisma.baseDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(docs);
  } catch (err) {
    logger.error('[BaseDocs] Error listing:', err);
    res.status(500).json({ error: 'Error al listar documentos' });
  }
}

async function upload(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se ha subido ningún archivo' });
    const { name, category, isTemplate, requiresSignature } = req.body;

    let driveData = null;
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

    if (rootFolderId) {
      try {
        driveData = await driveService.uploadFile(
          rootFolderId,
          req.file.path,
          req.file.originalname,
          req.file.mimetype
        );
      } catch (driveErr) {
        logger.warn('[BaseDocs] Drive upload failed, saving locally only:', driveErr.message);
      }
    }

    const doc = await prisma.baseDocument.create({
      data: {
        name: name || req.file.originalname,
        category: category || 'GENERAL',
        driveUrl: driveData?.webViewLink,
        driveFileId: driveData?.id,
        localPath: req.file.path,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        isTemplate: isTemplate === 'true' || isTemplate === true,
        requiresSignature: requiresSignature === 'true' || requiresSignature === true,
      },
    });

    // Si es plantilla, detectar placeholders automáticamente
    let placeholders = [];
    if (doc.isTemplate && req.file.mimetype?.includes('officedocument')) {
      try {
        placeholders = await templateEngine.detectPlaceholders(req.file.path);
        
        // Actualizar documento con placeholders detectados
        await prisma.baseDocument.update({
          where: { id: doc.id },
          data: {
            templateFormat: 'DOCX',
            placeholders: JSON.stringify(placeholders),
          },
        });
        
        doc.placeholders = placeholders;
      } catch (detectErr) {
        logger.warn('[BaseDocs] Error detecting placeholders:', detectErr.message);
      }
    }

    res.status(201).json(doc);
  } catch (err) {
    logger.error('[BaseDocs] Error uploading:', err);
    res.status(500).json({ error: 'Error al subir documento' });
  }
}

async function download(req, res) {
  const { id } = req.params;
  try {
    const doc = await prisma.baseDocument.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });

    if (doc.localPath && fs.existsSync(doc.localPath)) {
      const absolutePath = path.resolve(doc.localPath);
      const ext = path.extname(doc.localPath);
      const safeName = doc.name.endsWith(ext) ? doc.name : `${doc.name}${ext}`;

      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeName)}"`);
      if (doc.mimeType) res.setHeader('Content-Type', doc.mimeType);
      return res.sendFile(absolutePath);
    } else if (doc.driveUrl) {
      return res.redirect(doc.driveUrl);
    }
    res.status(404).json({ error: 'Archivo no disponible' });
  } catch (err) {
    logger.error('[BaseDocs] Error downloading:', err);
    res.status(500).json({ error: 'Error al descargar' });
  }
}

/**
 * Vista previa: convierte el documento a HTML para que el navegador lo muestre.
 * - PDF / imágenes → se sirven directamente (el navegador sabe renderizarlos)
 * - DOCX → se convierte a HTML con mammoth
 * - Otros → se devuelve una página HTML con mensaje indicativo
 */
async function preview(req, res) {
  const { id } = req.params;
  try {
    const doc = await prisma.baseDocument.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });

    if (!doc.localPath || !fs.existsSync(doc.localPath)) {
      if (doc.driveUrl) return res.redirect(doc.driveUrl);
      return res.status(404).json({ error: 'Archivo no disponible' });
    }

    const absolutePath = path.resolve(doc.localPath);
    const mime = doc.mimeType || '';

    // PDFs e imágenes: el navegador los renderiza nativamente
    if (mime === 'application/pdf' || mime.startsWith('image/')) {
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', 'inline');
      return res.sendFile(absolutePath);
    }

    // Texto plano
    if (mime === 'text/plain' || mime === 'text/csv') {
      const content = fs.readFileSync(absolutePath, 'utf8');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>body{font-family:monospace;white-space:pre-wrap;padding:32px;background:#fafafa;color:#1a1a1a;font-size:14px;line-height:1.6;max-width:900px;margin:0 auto;}</style>
        </head><body>${content.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</body></html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    }

    // Word DOCX → convertir a HTML
    if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mime === 'application/msword' ||
        doc.localPath.endsWith('.docx') || doc.localPath.endsWith('.doc')) {
      try {
        const result = await mammoth.convertToHtml({ path: absolutePath });
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
          <style>
            *{box-sizing:border-box;}
            body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
              padding:40px;background:#fff;color:#1a1a1a;font-size:15px;line-height:1.7;
              max-width:800px;margin:0 auto;}
            h1{font-size:24px;margin:24px 0 12px;color:#111;}
            h2{font-size:20px;margin:20px 0 10px;color:#222;}
            h3{font-size:17px;margin:16px 0 8px;color:#333;}
            p{margin:8px 0;}
            table{border-collapse:collapse;width:100%;margin:16px 0;}
            th,td{border:1px solid #ddd;padding:8px 12px;text-align:left;}
            th{background:#f5f5f5;font-weight:600;}
            ul,ol{margin:8px 0;padding-left:24px;}
            img{max-width:100%;height:auto;}
          </style></head><body>${result.value}</body></html>`;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      } catch (convErr) {
        logger.warn('[BaseDocs] Mammoth conversion failed:', convErr.message);
      }
    }

    // Cualquier otro formato: página informativa
    const ext = path.extname(doc.localPath);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
          display:flex;align-items:center;justify-content:center;min-height:100vh;
          background:#f9fafb;margin:0;color:#6b7280;}
        .card{text-align:center;padding:48px;background:white;border-radius:16px;
          box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:400px;}
        .icon{font-size:48px;margin-bottom:16px;}
        h2{color:#111827;margin:0 0 8px;}
        p{margin:4px 0;font-size:14px;}
        .ext{display:inline-block;background:#e5e7eb;color:#374151;padding:4px 12px;
          border-radius:8px;font-weight:700;font-size:13px;margin-top:12px;}
      </style></head><body>
      <div class="card">
        <div class="icon">📄</div>
        <h2>${doc.name}</h2>
        <p>Este tipo de archivo no se puede previsualizar en el navegador.</p>
        <p>Usa el botón <strong>"Descargar"</strong> para abrirlo en tu ordenador.</p>
        <span class="ext">${ext.toUpperCase()}</span>
      </div></body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);

  } catch (err) {
    logger.error('[BaseDocs] Error preview:', err);
    res.status(500).json({ error: 'Error al generar vista previa' });
  }
}

async function update(req, res) {
  const { id } = req.params;
  const { name, category, isTemplate, requiresSignature, placeholders, signerRoles } = req.body;
  try {
    const doc = await prisma.baseDocument.update({
      where: { id },
      data: { 
        name, 
        category,
        ...(isTemplate !== undefined && { isTemplate }),
        ...(requiresSignature !== undefined && { requiresSignature }),
        ...(placeholders && { placeholders: typeof placeholders === 'string' ? placeholders : JSON.stringify(placeholders) }),
        ...(signerRoles && { signerRoles: typeof signerRoles === 'string' ? signerRoles : JSON.stringify(signerRoles) }),
      },
    });
    res.json(doc);
  } catch (err) {
    logger.error('[BaseDocs] Error updating:', err);
    res.status(500).json({ error: 'Error al actualizar documento' });
  }
}

/**
 * Detectar placeholders en un documento existente
 * POST /api/base-documents/:id/detect-placeholders
 */
async function detectPlaceholders(req, res) {
  try {
    const { id } = req.params;
    
    const doc = await prisma.baseDocument.findUnique({ where: { id } });
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado' });
    
    if (!doc.localPath || !fs.existsSync(doc.localPath)) {
      return res.status(404).json({ error: 'Archivo no disponible' });
    }

    const placeholders = await templateEngine.detectPlaceholders(doc.localPath);
    
    // Actualizar documento
    await prisma.baseDocument.update({
      where: { id },
      data: {
        isTemplate: true,
        templateFormat: 'DOCX',
        placeholders: JSON.stringify(placeholders),
      },
    });

    res.json({ placeholders });
  } catch (err) {
    logger.error('[BaseDocs] Error detecting placeholders:', err);
    res.status(500).json({ error: 'Error al detectar placeholders' });
  }
}

/**
 * Obtener lista de variables de plantilla disponibles
 * GET /api/base-documents/template-variables
 */
async function getTemplateVariables(req, res) {
  const { getAllVariables } = require('../constants/template-variables.constants');
  res.json(getAllVariables());
}

async function remove(req, res) {
  const { id } = req.params;
  try {
    await prisma.baseDocument.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    logger.error('[BaseDocs] Error removing:', err);
    res.status(500).json({ error: 'Error al eliminar documento' });
  }
}

module.exports = { 
  list, upload, download, preview, update, remove, 
  detectPlaceholders, getTemplateVariables 
};
