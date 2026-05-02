const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/search.controller');

// POST /search/query - Búsqueda full-text
router.post('/query', authenticate, ctrl.searchFullText);

// POST /search/by-price - Búsqueda por rango de precio
router.post('/by-price', authenticate, ctrl.searchByPriceRange);

// POST /search/by-date - Búsqueda por rango de fecha
router.post('/by-date', authenticate, ctrl.searchByDateRange);

// POST /search/saved - Guardar búsqueda
router.post('/saved', authenticate, ctrl.saveSearchFilter);

// GET /search/saved - Obtener búsquedas guardadas
router.get('/saved', authenticate, ctrl.getUserSavedSearches);

// DELETE /search/saved/:searchId - Eliminar búsqueda
router.delete('/saved/:searchId', authenticate, ctrl.deleteSavedSearch);

// POST /search/index/rebuild - Reconstruir índice (solo ADMIN)
router.post('/index/rebuild', authenticate, authorize('ADMINISTRACION'), ctrl.rebuildSearchIndex);

module.exports = router;
