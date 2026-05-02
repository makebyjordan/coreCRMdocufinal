/**
 * Media Controller
 * Gestión de multimedia para expedientes (fotos, videos, planos, tours 360, docs marketing)
 */

const { prisma } = require('../config/db');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

// ─── Obtener multimedia por expediente ───────────────────────────────────────

async function getByExpedient(req, res) {
  const { expedientId } = req.params;
  const { type, status = 'ACTIVE' } = req.query;

  const where = {
    expedientId,
    status: status || undefined,
    ...(type && { type }),
  };

  const media = await prisma.propertyMedia.findMany({
    where,
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    include: {
      uploadedBy: { select: { id: true, name: true } },
    },
  });

  // Añadir URL pública a cada item
  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'localhost:4000';
  const mediaWithUrls = media.map((item) => ({
    ...item,
    url: `${protocol}://${host}/uploads/media/${expedientId}/${item.filename}`,
  }));

  res.json(mediaWithUrls);
}

// ─── Subir archivos multimedia ───────────────────────────────────────────────

async function upload(req, res) {
  const { expedientId } = req.params;
  const files = req.files;
  const userId = req.user?.id;
  const title = req.body?.title;

  logger.info(`[Media] Upload started for expedient ${expedientId}, files: ${files?.length || 0}, title: ${title}`);

  if (!files || files.length === 0) {
    logger.warn(`[Media] No files provided for expedient ${expedientId}`);
    return res.status(400).json({ error: 'No se han proporcionado archivos' });
  }

  const created = [];

  try {
    for (const file of files) {
      logger.info(`[Media] Processing file: ${file.originalname}, type: ${file.mimetype}, size: ${file.size}`);
      const relativePath = `media/${expedientId}/${file.filename}`;

      const media = await prisma.propertyMedia.create({
        data: {
          expedientId,
          uploadedById: userId,
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          filePath: relativePath,
          type: inferMediaType(file.mimetype, file.originalname),
          status: 'ACTIVE',
          title: title || null,
          portalSync: {
            idealista: { enabled: false, externalId: null, syncedAt: null },
            fotocasa: { enabled: false, externalId: null, syncedAt: null },
            habitaclia: { enabled: false, externalId: null, syncedAt: null },
          },
        },
      });

      const protocol = req.protocol || 'http';
      const host = req.get('host') || 'localhost:4000';
      created.push({
        ...media,
        url: `${protocol}://${host}/uploads/media/${expedientId}/${file.filename}`,
      });
    }

    logger.info(`[Media] ${created.length} archivos subidos al expediente ${expedientId}`);
    res.status(201).json(created);
  } catch (err) {
    logger.error('[Media] Error uploading files:', err);
    res.status(500).json({ error: err.message || 'Error interno al subir archivos' });
  }
}

// ─── Inferir tipo de media según mimeType ────────────────────────────────────

function inferMediaType(mimeType, originalName) {
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType === 'application/pdf') return 'DOCUMENT_MKT';

  const ext = path.extname(originalName).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff'].includes(ext)) {
    // Detectar planos por nombre
    const lowerName = originalName.toLowerCase();
    if (lowerName.includes('plano') || lowerName.includes('floor') || lowerName.includes('distribucion')) {
      return 'FLOOR_PLAN';
    }
    return 'PHOTO';
  }

  return 'DOCUMENT_MKT';
}

// ─── Actualizar metadatos de un archivo ──────────────────────────────────────

async function update(req, res) {
  const { id } = req.params;
  const { title, description, type, isCover, status } = req.body;

  const existing = await prisma.propertyMedia.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Archivo multimedia no encontrado' });
  }

  // Si se marca como portada, quitar portada de otros del mismo expediente
  if (isCover === true) {
    await prisma.propertyMedia.updateMany({
      where: { expedientId: existing.expedientId, isCover: true },
      data: { isCover: false },
    });
  }

  const updated = await prisma.propertyMedia.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(type !== undefined && { type }),
      ...(isCover !== undefined && { isCover }),
      ...(status !== undefined && { status }),
    },
    include: {
      uploadedBy: { select: { id: true, name: true } },
    },
  });

  res.json({
    ...updated,
    url: `/uploads/media/${updated.expedientId}/${updated.filename}`,
  });
}

// ─── Reordenar archivos ──────────────────────────────────────────────────────

async function reorder(req, res) {
  const { expedientId } = req.params;
  const { orders } = req.body; // [{ id, order }]

  if (!Array.isArray(orders)) {
    return res.status(400).json({ error: 'Se requiere un array de órdenes' });
  }

  const updates = orders.map(({ id, order }) =>
    prisma.propertyMedia.update({
      where: { id, expedientId },
      data: { order },
    })
  );

  await prisma.$transaction(updates);

  res.json({ message: 'Orden actualizado correctamente' });
}

// ─── Eliminar archivo ────────────────────────────────────────────────────────

async function remove(req, res) {
  const { id } = req.params;

  const existing = await prisma.propertyMedia.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Archivo multimedia no encontrado' });
  }

  // Eliminar archivo físico
  const fullPath = path.join(__dirname, '../../uploads', ...existing.filePath.split('/'));
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    logger.warn(`[Media] No se pudo eliminar archivo físico: ${fullPath}`, err.message);
  }

  await prisma.propertyMedia.delete({ where: { id } });

  logger.info(`[Media] Archivo ${id} eliminado del expediente ${existing.expedientId}`);
  res.json({ message: 'Archivo eliminado correctamente' });
}

// ─── Sincronizar con portales ────────────────────────────────────────────────

async function syncPortal(req, res) {
  const { id } = req.params;
  const { portal, enabled } = req.body;

  const validPortals = ['idealista', 'fotocasa', 'habitaclia'];
  if (!validPortals.includes(portal)) {
    return res.status(400).json({ error: 'Portal no válido' });
  }

  const existing = await prisma.propertyMedia.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Archivo multimedia no encontrado' });
  }

  const portalSync = existing.portalSync || {};

  // PLACEHOLDER: Aquí irá la llamada real a la API del portal cuando se conecte
  // Ejemplo:
  // if (enabled) {
  //   const result = await portalApi.uploadImage(existing, portal);
  //   portalSync[portal] = { enabled: true, externalId: result.id, syncedAt: new Date() };
  // } else {
  //   await portalApi.deleteImage(portalSync[portal].externalId, portal);
  //   portalSync[portal] = { enabled: false, externalId: null, syncedAt: null };
  // }

  // Por ahora solo actualizamos el estado local
  portalSync[portal] = {
    ...portalSync[portal],
    enabled,
    syncedAt: enabled ? new Date().toISOString() : null,
  };

  const updated = await prisma.propertyMedia.update({
    where: { id },
    data: { portalSync, lastSyncAt: new Date() },
  });

  logger.info(`[Media] Portal ${portal} ${enabled ? 'activado' : 'desactivado'} para archivo ${id}`);
  res.json({
    ...updated,
    url: `/uploads/media/${updated.expedientId}/${updated.filename}`,
  });
}

// ─── Subir desde URL ───────────────────────────────────────────────────────────

async function uploadFromUrl(req, res) {
  const { expedientId } = req.params;
  const { url, title, type = 'PHOTO' } = req.body;
  const userId = req.user?.id;

  if (!url) {
    return res.status(400).json({ error: 'Se requiere una URL' });
  }

  // Validar que sea una URL válida
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: 'URL no válida' });
  }

  const allowedProtocols = ['http:', 'https:'];
  if (!allowedProtocols.includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: 'Solo se permiten URLs HTTP/HTTPS' });
  }

  // Crear directorio
  const UPLOAD_DIR = path.join(__dirname, '../../uploads/media');
  const dir = path.join(UPLOAD_DIR, expedientId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Generar nombre único
  const ext = path.extname(parsedUrl.pathname) || '.jpg';
  const filename = `${uuidv4()}${ext}`;
  const filepath = path.join(dir, filename);
  const relativePath = `media/${expedientId}/${filename}`;

  // Descargar imagen
  try {
    await downloadFile(url, filepath);
  } catch (err) {
    logger.error(`[Media] Error descargando desde URL: ${url}`, err);
    return res.status(400).json({ error: 'No se pudo descargar la imagen desde la URL' });
  }

  // Obtener tamaño del archivo
  const stats = fs.statSync(filepath);

  // Inferir mimeType
  const mimeType = getMimeType(ext);

  // Crear registro en DB
  const media = await prisma.propertyMedia.create({
    data: {
      expedientId,
      uploadedById: userId,
      filename,
      originalName: title || path.basename(parsedUrl.pathname) || 'image.jpg',
      mimeType,
      fileSize: stats.size,
      filePath: relativePath,
      type,
      status: 'ACTIVE',
      title: title || null,
      portalSync: {
        idealista: { enabled: false, externalId: null, syncedAt: null },
        fotocasa: { enabled: false, externalId: null, syncedAt: null },
        habitaclia: { enabled: false, externalId: null, syncedAt: null },
      },
    },
  });

  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'localhost:4000';
  logger.info(`[Media] Imagen desde URL subida al expediente ${expedientId}`);
  res.status(201).json({
    ...media,
    url: `${protocol}://${host}/uploads/media/${expedientId}/${filename}`,
  });
}

// ─── Helper para descargar archivo ───────────────────────────────────────────

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    const file = fs.createWriteStream(dest);

    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {}); // Limpiar archivo parcial
      reject(err);
    });
  });
}

function getMimeType(ext) {
  const map = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.avi': 'video/avi',
    '.pdf': 'application/pdf',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  getByExpedient,
  upload,
  uploadFromUrl,
  update,
  reorder,
  remove,
  syncPortal,
};
