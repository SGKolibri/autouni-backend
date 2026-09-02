import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { BuildingsRepository } from '../repository/buildings.repository';

describe('BuildingsService', () => {
  let service: BuildingsService;
  let repository: jest.Mocked<BuildingsRepository>;

  const mockBuilding = {
    id: 'building-uuid-1',
    name: 'Bloco A',
    description: 'Main block',
    location: 'Campus Central',
    totalEnergy: 0,
    activeDevices: 0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuildingsService,
        {
          provide: BuildingsRepository,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            findByIdWithRelations: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            getStats: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BuildingsService>(BuildingsService);
    repository = module.get(BuildingsRepository);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should delegate to repository', async () => {
      repository.create.mockResolvedValue(mockBuilding as any);
      const dto = { name: 'Bloco A', location: 'Campus Central' };
      const result = await service.create(dto);
      expect(result).toEqual(mockBuilding);
      expect(repository.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all buildings', async () => {
      repository.findAll.mockResolvedValue([mockBuilding] as any);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(repository.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no buildings', async () => {
      repository.findAll.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return building when found', async () => {
      repository.findById.mockResolvedValue(mockBuilding as any);
      const result = await service.findById('building-uuid-1');
      expect(result).toEqual(mockBuilding);
      expect(repository.findById).toHaveBeenCalledWith('building-uuid-1');
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByIdWithRelations', () => {
    it('should return building with relations when found', async () => {
      const withRelations = { ...mockBuilding, floors: [] };
      repository.findByIdWithRelations.mockResolvedValue(withRelations as any);
      const result = await service.findByIdWithRelations('building-uuid-1');
      expect(result).toEqual(withRelations);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findByIdWithRelations.mockResolvedValue(null);
      await expect(service.findByIdWithRelations('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update and return building when found', async () => {
      const updated = { ...mockBuilding, name: 'Bloco B' };
      repository.findById.mockResolvedValue(mockBuilding as any);
      repository.update.mockResolvedValue(updated as any);
      const result = await service.update('building-uuid-1', { name: 'Bloco B' });
      expect(result).toEqual(updated);
      expect(repository.update).toHaveBeenCalledWith('building-uuid-1', { name: 'Bloco B' });
    });

    it('should throw NotFoundException when building not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update('non-existent', { name: 'Bloco B' })).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete and return building when found', async () => {
      repository.findById.mockResolvedValue(mockBuilding as any);
      repository.delete.mockResolvedValue(mockBuilding as any);
      const result = await service.delete('building-uuid-1');
      expect(result).toEqual(mockBuilding);
      expect(repository.delete).toHaveBeenCalledWith('building-uuid-1');
    });

    it('should throw NotFoundException when building not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    const mockStats = {
      totalFloors: 3,
      totalRooms: 10,
      totalDevices: 25,
      totalEnergy: 500,
      activeDevices: 20,
    };

    it('should return stats when building found', async () => {
      repository.findById.mockResolvedValue(mockBuilding as any);
      repository.getStats.mockResolvedValue(mockStats);
      const result = await service.getStats('building-uuid-1');
      expect(result).toEqual(mockStats);
      expect(repository.getStats).toHaveBeenCalledWith('building-uuid-1');
    });

    it('should throw NotFoundException when building not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.getStats('non-existent')).rejects.toThrow(NotFoundException);
      expect(repository.getStats).not.toHaveBeenCalled();
    });
  });
});
