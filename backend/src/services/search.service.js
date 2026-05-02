const { prisma } = require('../config/db');
const logger = require('../config/logger');

/**
 * Inicializa el índice de búsqueda para todos los expedientes y clientes
 * Se ejecuta en background al iniciar la app
 */
async function initializeSearchIndex() {
  try {
    logger.info('[Search] Initializing search index...');

    // Limpiar índice anterior
    await prisma.searchIndex.deleteMany({});

    // Indexar expedientes
    const expedients = await prisma.expedient.findMany({
      select: {
        id: true,
        code: true,
        propertyAddress: true,
        propertyCity: true,
        client: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    const expedientIndexes = expedients.map(e => ({
      expedientId: e.id,
      clientId: null,
      searchText: `${e.code} ${e.propertyAddress || ''} ${e.propertyCity || ''} ${e.client?.firstName || ''} ${e.client?.lastName || ''} ${e.client?.email || ''}`.toLowerCase(),
    }));

    // Indexar clientes
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        tags: true,
      },
    });

    const clientIndexes = clients.map(c => ({
      expedientId: null,
      clientId: c.id,
      searchText: `${c.firstName || ''} ${c.lastName || ''} ${c.email || ''} ${c.phone || ''} ${c.address || ''} ${c.tags.join(' ')}`.toLowerCase(),
    }));

    await prisma.searchIndex.createMany({
      data: [...expedientIndexes, ...clientIndexes],
      skipDuplicates: true,
    });

    logger.info(`[Search] Index initialized: ${expedients.length} expedients, ${clients.length} clients`);
  } catch (error) {
    logger.error('[Search] Error initializing search index:', error);
  }
}

/**
 * Búsqueda full-text en expedientes y clientes
 * @param {string} query - Término de búsqueda
 * @param {string} entityType - 'expedient', 'client', o 'all'
 * @param {number} limit - Límite de resultados
 * @returns {Object} { expedients, clients, total }
 */
async function searchFullText(query, entityType = 'all', limit = 20) {
  try {
    const lowerQuery = query.toLowerCase();

    let expedients = [];
    let clients = [];

    if (entityType === 'expedient' || entityType === 'all') {
      const indexedExpedients = await prisma.searchIndex.findMany({
        where: {
          expedientId: { not: null },
          searchText: { contains: lowerQuery },
        },
        select: { expedientId: true },
        take: limit,
      });

      const expedientIds = indexedExpedients.map(x => x.expedientId);
      expedients = await prisma.expedient.findMany({
        where: { id: { in: expedientIds } },
        select: {
          id: true,
          code: true,
          propertyAddress: true,
          propertyPrice: true,
          currentPhase: true,
          client: { select: { firstName: true, lastName: true } },
        },
        take: limit,
      });
    }

    if (entityType === 'client' || entityType === 'all') {
      const indexedClients = await prisma.searchIndex.findMany({
        where: {
          clientId: { not: null },
          searchText: { contains: lowerQuery },
        },
        select: { clientId: true },
        take: limit,
      });

      const clientIds = indexedClients.map(x => x.clientId);
      clients = await prisma.client.findMany({
        where: { id: { in: clientIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          score: true,
        },
        take: limit,
      });
    }

    logger.info(`[Search] Query "${query}": ${expedients.length + clients.length} results`);

    return {
      expedients,
      clients,
      total: expedients.length + clients.length,
      query,
    };
  } catch (error) {
    logger.error('[Search] Error in full-text search:', error);
    throw error;
  }
}

/**
 * Guarda una búsqueda para reutilizarla después
 * @param {string} userId
 * @param {Object} filters - { search, operationType, status, phase, priceMin, priceMax, etc }
 * @param {string} name - Nombre de la búsqueda guardada
 * @returns {Object} SavedSearch creado
 */
async function saveSearchFilter(userId, filters, name) {
  try {
    const saved = await prisma.savedSearch.upsert({
      where: {
        userId_name: {
          userId,
          name,
        },
      },
      update: {
        filters,
      },
      create: {
        userId,
        name,
        filters,
        searchText: filters.search || null,
      },
    });

    logger.info(`[Search] Saved search "${name}" for user ${userId}`);
    return saved;
  } catch (error) {
    logger.error('[Search] Error saving search filter:', error);
    throw error;
  }
}

/**
 * Obtiene búsqueda guardada por defecto del usuario
 * @param {string} userId
 * @returns {Object} SavedSearch o null
 */
async function getDefaultSearch(userId) {
  try {
    const defaultSearch = await prisma.savedSearch.findFirst({
      where: { userId, isDefault: true },
    });

    return defaultSearch || null;
  } catch (error) {
    logger.error('[Search] Error getting default search:', error);
    throw error;
  }
}

/**
 * Obtiene todas las búsquedas guardadas del usuario
 * @param {string} userId
 * @returns {Array} SavedSearches
 */
async function getUserSavedSearches(userId) {
  try {
    const searches = await prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return searches;
  } catch (error) {
    logger.error('[Search] Error getting user saved searches:', error);
    throw error;
  }
}

/**
 * Elimina una búsqueda guardada
 * @param {string} searchId
 * @returns {Object} SavedSearch eliminado
 */
async function deleteSavedSearch(searchId) {
  try {
    const deleted = await prisma.savedSearch.delete({
      where: { id: searchId },
    });

    logger.info(`[Search] Deleted saved search ${searchId}`);
    return deleted;
  } catch (error) {
    logger.error('[Search] Error deleting saved search:', error);
    throw error;
  }
}

/**
 * Actualiza el índice cuando se crea o modifica un expediente
 * @param {string} expedientId
 */
async function updateSearchIndex(expedientId) {
  try {
    const expedient = await prisma.expedient.findUnique({
      where: { id: expedientId },
      select: {
        id: true,
        code: true,
        propertyAddress: true,
        propertyCity: true,
        client: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    if (!expedient) return;

    const searchText = `${expedient.code} ${expedient.propertyAddress || ''} ${expedient.propertyCity || ''} ${expedient.client?.firstName || ''} ${expedient.client?.lastName || ''} ${expedient.client?.email || ''}`.toLowerCase();

    await prisma.searchIndex.upsert({
      where: { id: expedientId }, // Esto asume que el searchIndex tiene el mismo ID que el expedient
      update: { searchText },
      create: {
        expedientId: expedient.id,
        clientId: null,
        searchText,
      },
    });

    logger.info(`[Search] Updated search index for expedient ${expedientId}`);
  } catch (error) {
    logger.error('[Search] Error updating search index:', error);
  }
}

/**
 * Busca expedientes por rango de precio
 * @param {number} minPrice
 * @param {number} maxPrice
 * @returns {Array} Expedientes en rango de precio
 */
async function searchByPriceRange(minPrice, maxPrice) {
  try {
    const expedients = await prisma.expedient.findMany({
      where: {
        propertyPrice: {
          gte: minPrice,
          lte: maxPrice,
        },
      },
      select: {
        id: true,
        code: true,
        propertyAddress: true,
        propertyPrice: true,
        propertyCity: true,
        currentPhase: true,
      },
    });

    return expedients;
  } catch (error) {
    logger.error('[Search] Error searching by price range:', error);
    throw error;
  }
}

/**
 * Busca expedientes por rango de fechas
 * @param {Date} dateFrom
 * @param {Date} dateTo
 * @param {string} field - 'opened' o 'closed'
 * @returns {Array} Expedientes en rango de fechas
 */
async function searchByDateRange(dateFrom, dateTo, field = 'opened') {
  try {
    const where =
      field === 'closed'
        ? {
            closedAt: { gte: dateFrom, lte: dateTo },
            status: 'COMPLETADO',
          }
        : {
            openedAt: { gte: dateFrom, lte: dateTo },
          };

    const expedients = await prisma.expedient.findMany({
      where,
      select: {
        id: true,
        code: true,
        propertyAddress: true,
        currentPhase: true,
        openedAt: true,
        closedAt: true,
      },
      orderBy: { [field === 'closed' ? 'closedAt' : 'openedAt']: 'desc' },
    });

    return expedients;
  } catch (error) {
    logger.error('[Search] Error searching by date range:', error);
    throw error;
  }
}

module.exports = {
  initializeSearchIndex,
  searchFullText,
  saveSearchFilter,
  getDefaultSearch,
  getUserSavedSearches,
  deleteSavedSearch,
  updateSearchIndex,
  searchByPriceRange,
  searchByDateRange,
};
