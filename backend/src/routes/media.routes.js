/**
 * Media Routes
 * Rutas para gestión de multimedia de expedientes
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const mediaController = require('../controllers/media.controller');
const logger = require('../config/logger');

const router = express.Router();

// ─── Configuración de Multer para Media ──────────────────────────────────────

const UPLOAD_DIR = path.join(__dirname, '../../uploads/media');

// Crear directorio base si no existe
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const expedientId = req.params.expedientId || 'misc';
    const dir = path.join(UPLOAD_DIR, expedientId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/tiff',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/avi',
    'application/pdf',
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.mp4', '.mov', '.webm', '.avi', '.pdf'];

  if (allowed.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB por archivo
    files: 50, // máximo 50 archivos por upload
  },
});

// ─── Rutas ───────────────────────────────────────────────────────────────────

// GET /api/media/expedient/:expedientId - Listar multimedia de un expediente
router.get('/expedient/:expedientId', mediaController.getByExpedient);

// POST /api/media/expedient/:expedientId/upload - Subir archivos
// Helper para manejar errores de multer
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Archivo demasiado grande (máx. 100 MB)' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Demasiados archivos (máx. 50)' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    logger.error('[Media Upload Error]', err);
    return res.status(400).json({ error: err.message });
  }
  next();
}

router.post(
  '/expedient/:expedientId/upload',
  upload.array('files', 50),
  handleMulterError,
  mediaController.upload
);

// POST /api/media/expedient/:expedientId/upload-url - Subir desde URL
router.post('/expedient/:expedientId/upload-url', mediaController.uploadFromUrl);

// PATCH /api/media/expedient/:expedientId/reorder - Reordenar archivos
router.patch('/expedient/:expedientId/reorder', mediaController.reorder);

// PATCH /api/media/:id - Actualizar metadatos
router.patch('/:id', mediaController.update);

// POST /api/media/:id/portal-sync - Sincronizar con portales
router.post('/:id/portal-sync', mediaController.syncPortal);

// DELETE /api/media/:id - Eliminar archivo
router.delete('/:id', mediaController.remove);

module.exports = router;
