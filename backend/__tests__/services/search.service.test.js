jest.mock('../../src/config/db', () => ({
  prisma: {
    searchIndex: {
      deleteMany: jest.fn().mockResolvedValue({}),
      createMany: jest.fn().mockResolvedValue({ count: 5 }),
      findMany: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    expedient: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    client: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    savedSearch: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const { prisma } = require('../../src/config/db');
const searchService = require('../../src/services/search.service');

describe('search.service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('initializeSearchIndex', () => {
    it('clears old index and rebuilds', async () => {
      await searchService.initializeSearchIndex();
      expect(prisma.searchIndex.deleteMany).toHaveBeenCalled();
      expect(prisma.expedient.findMany).toHaveBeenCalled();
      expect(prisma.client.findMany).toHaveBeenCalled();
    });
  });

  describe('searchFullText', () => {
    it('returns matching results', async () => {
      const mockResults = [
        { id: '1', expedientId: 'exp1', clientId: null, searchText: 'calle mayor madrid', expedient: { id: 'exp1', code: 'EXP-001' }, client: null },
      ];
      prisma.searchIndex.findMany.mockResolvedValue(mockResults);
      prisma.searchIndex.count.mockResolvedValue(1);

      const result = await searchService.searchFullText('madrid');
      expect(prisma.searchIndex.findMany).toHaveBeenCalled();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total', 1);
    });

    it('returns empty for short queries', async () => {
      const result = await searchService.searchFullText('ab');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(0);
    });
  });

  describe('saveSearchFilter', () => {
    it('persists a named search for a user', async () => {
      const mockSaved = { id: 'saved1', userId: 'u1', name: 'Mi búsqueda', filters: {} };
      prisma.savedSearch.create.mockResolvedValue(mockSaved);

      const result = await searchService.saveSearchFilter('u1', { city: 'Madrid' }, 'Mi búsqueda');
      expect(prisma.savedSearch.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'u1', name: 'Mi búsqueda' }) })
      );
      expect(result.name).toBe('Mi búsqueda');
    });
  });

  describe('getUserSavedSearches', () => {
    it('retrieves saved searches for user', async () => {
      const mock = [{ id: 's1', name: 'Búsqueda 1' }];
      prisma.savedSearch.findMany.mockResolvedValue(mock);

      const result = await searchService.getUserSavedSearches('u1');
      expect(result).toHaveLength(1);
      expect(prisma.savedSearch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1' } })
      );
    });
  });
});
