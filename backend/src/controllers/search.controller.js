const { isAdmin, isCommercial, userHasAnyRole } = require('../utils/roleHelper');
const { prisma } = require('../config/db');
const { validationResult } = require('express-validator');
const searchService = require('../services/search.service');
const logger = require('../config/logger');

/**
 * POST /search/query
 * Búsqueda full-text de expedientes, clientes, documentos
 */
async function searchFullText(req, res) {
  try {
    const { query, entityType = 'all', limit = 50, offset = 0 } = req.body;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const results = await searchService.searchFullText(query, entityType);
    const paginated = results.slice(offset, offset + limit);

    res.json({
      query,
      entityType,
      totalResults: results.length,
      results: paginated,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('[Search] Full-text search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
}

/**
 * POST /search/by-price
 * Búsqueda por rango de precio
 */
async function searchByPriceRange(req, res) {
  try {
    const { minPrice, maxPrice, operationType, limit = 50, offset = 0 } = req.body;

    if (!minPrice || !maxPrice) {
      return res.status(400).json({ error: 'minPrice and maxPrice required' });
    }

    const results = await searchService.searchByPriceRange(minPrice, maxPrice, operationType);
    const paginated = results.slice(offset, offset + limit);

    res.json({
      filters: { minPrice, maxPrice, operationType },
      totalResults: results.length,
      results: paginated,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('[Search] Price range search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
}

/**
 * POST /search/by-date
 * Búsqueda por rango de fecha
 */
async function searchByDateRange(req, res) {
  try {
    const { dateFrom, dateTo, fieldName = 'openedAt', limit = 50, offset = 0 } = req.body;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({ error: 'dateFrom and dateTo required' });
    }

    const results = await searchService.searchByDateRange(dateFrom, dateTo, fieldName);
    const paginated = results.slice(offset, offset + limit);

    res.json({
      filters: { dateFrom, dateTo, fieldName },
      totalResults: results.length,
      results: paginated,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('[Search] Date range search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
}

/**
 * POST /search/saved
 * Guardar una búsqueda
 */
async function saveSearchFilter(req, res) {
  try {
    const { name, filters } = req.body;

    if (!name || !filters) {
      return res.status(400).json({ error: 'name and filters required' });
    }

    const savedSearch = await prisma.savedSearch.upsert({
      where: {
        userId_name: { userId: req.user.id, name },
      },
      update: {
        filters: JSON.stringify(filters),
      },
      create: {
        userId: req.user.id,
        name,
        filters: JSON.stringify(filters),
        isDefault: false,
      },
    });

    logger.info(`[Search] Saved search "${name}" for user ${req.user.id}`);

    res.json({
      id: savedSearch.id,
      name: savedSearch.name,
      filters: JSON.parse(savedSearch.filters),
      createdAt: savedSearch.createdAt,
    });
  } catch (error) {
    logger.error('[Search] Save search filter error:', error);
    res.status(500).json({ error: 'Failed to save search' });
  }
}

/**
 * GET /search/saved
 * Obtener búsquedas guardadas del usuario
 */
async function getUserSavedSearches(req, res) {
  try {
    const searches = await prisma.savedSearch.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        name: true,
        filters: true,
        isDefault: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const parsed = searches.map(s => ({
      ...s,
      filters: JSON.parse(s.filters),
    }));

    res.json(parsed);
  } catch (error) {
    logger.error('[Search] Get saved searches error:', error);
    res.status(500).json({ error: 'Failed to get saved searches' });
  }
}

/**
 * DELETE /search/saved/:searchId
 * Eliminar búsqueda guardada
 */
async function deleteSavedSearch(req, res) {
  try {
    const { searchId } = req.params;

    const search = await prisma.savedSearch.findUnique({
      where: { id: searchId },
    });

    if (!search) {
      return res.status(404).json({ error: 'Search not found' });
    }

    if (search.userId !== req.user.id && !userHasAnyRole(req.user, 'ADMINISTRACION')) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.savedSearch.delete({
      where: { id: searchId },
    });

    logger.info(`[Search] Deleted search ${searchId}`);

    res.json({ message: 'Search deleted' });
  } catch (error) {
    logger.error('[Search] Delete search error:', error);
    res.status(500).json({ error: 'Failed to delete search' });
  }
}

/**
 * POST /search/index/rebuild
 * Reconstruir índice de búsqueda (solo ADMIN)
 */
async function rebuildSearchIndex(req, res) {
  try {
    await searchService.initializeSearchIndex();
    res.json({ message: 'Search index rebuilt successfully' });
  } catch (error) {
    logger.error('[Search] Rebuild index error:', error);
    res.status(500).json({ error: 'Failed to rebuild index' });
  }
}

module.exports = {
  searchFullText,
  searchByPriceRange,
  searchByDateRange,
  saveSearchFilter,
  getUserSavedSearches,
  deleteSavedSearch,
  rebuildSearchIndex,
};
