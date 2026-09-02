import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FloorsService } from './floors.service';
import { FloorsRepository } from '../repository/floors.repository';

describe('FloorsService', () => {
  let service: FloorsService;
  let repository: jest.Mocked<FloorsRepository>;

  const mockFloor = {
    id: 'floor-uuid-1',
    buildingId: 'building-uuid-1',
    number: 1,
    name: 'Ground Floor',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FloorsService,
        {
          provide: FloorsRepository,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            findByIdWithRelations: jest.fn(),
            findByBuilding: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FloorsService>(FloorsService);
    repository = module.get(FloorsRepository);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should delegate to repository', async () => {
      repository.create.mockResolvedValue(mockFloor as any);
      const dto = { buildingId: 'building-uuid-1', number: 1 };
      const result = await service.create(dto);
      expect(result).toEqual(mockFloor);
      expect(repository.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all floors', async () => {
      repository.findAll.mockResolvedValue([mockFloor] as any);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(repository.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no floors', async () => {
      repository.findAll.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return floor when found', async () => {
      repository.findById.mockResolvedValue(mockFloor as any);
      const result = await service.findById('floor-uuid-1');
      expect(result).toEqual(mockFloor);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByIdWithRelations', () => {
    it('should return floor with relations when found', async () => {
      const withRelations = { ...mockFloor, rooms: [] };
      repository.findByIdWithRelations.mockResolvedValue(withRelations as any);
      const result = await service.findByIdWithRelations('floor-uuid-1');
      expect(result).toEqual(withRelations);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findByIdWithRelations.mockResolvedValue(null);
      await expect(service.findByIdWithRelations('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByBuilding', () => {
    it('should return floors for a building', async () => {
      repository.findByBuilding.mockResolvedValue([mockFloor] as any);
      const result = await service.findByBuilding('building-uuid-1');
      expect(result).toHaveLength(1);
      expect(repository.findByBuilding).toHaveBeenCalledWith('building-uuid-1');
    });
  });

  describe('update', () => {
    it('should update and return floor when found', async () => {
      const updated = { ...mockFloor, name: 'First Floor' };
      repository.findById.mockResolvedValue(mockFloor as any);
      repository.update.mockResolvedValue(updated as any);
      const result = await service.update('floor-uuid-1', { name: 'First Floor' });
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when floor not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update('non-existent', { name: 'First Floor' })).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete and return floor when found', async () => {
      repository.findById.mockResolvedValue(mockFloor as any);
      repository.delete.mockResolvedValue(mockFloor as any);
      const result = await service.delete('floor-uuid-1');
      expect(result).toEqual(mockFloor);
    });

    it('should throw NotFoundException when floor not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
