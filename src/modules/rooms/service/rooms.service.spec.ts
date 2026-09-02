import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsRepository } from '../repository/rooms.repository';

describe('RoomsService', () => {
  let service: RoomsService;
  let repository: jest.Mocked<RoomsRepository>;

  const mockRoom = {
    id: 'room-uuid-1',
    floorId: 'floor-uuid-1',
    name: 'Sala A101',
    type: 'CLASSROOM',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        {
          provide: RoomsRepository,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            findByIdWithRelations: jest.fn(),
            findByFloor: jest.fn(),
            findByType: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
    repository = module.get(RoomsRepository);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should delegate to repository', async () => {
      repository.create.mockResolvedValue(mockRoom as any);
      const dto = { floorId: 'floor-uuid-1', name: 'Sala A101', type: 'CLASSROOM' as any };
      const result = await service.create(dto);
      expect(result).toEqual(mockRoom);
      expect(repository.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all rooms', async () => {
      repository.findAll.mockResolvedValue([mockRoom] as any);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no rooms', async () => {
      repository.findAll.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return room when found', async () => {
      repository.findById.mockResolvedValue(mockRoom as any);
      const result = await service.findById('room-uuid-1');
      expect(result).toEqual(mockRoom);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByIdWithRelations', () => {
    it('should return room with relations when found', async () => {
      const withRelations = { ...mockRoom, devices: [] };
      repository.findByIdWithRelations.mockResolvedValue(withRelations as any);
      const result = await service.findByIdWithRelations('room-uuid-1');
      expect(result).toEqual(withRelations);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findByIdWithRelations.mockResolvedValue(null);
      await expect(service.findByIdWithRelations('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByFloor', () => {
    it('should return rooms for a floor', async () => {
      repository.findByFloor.mockResolvedValue([mockRoom] as any);
      const result = await service.findByFloor('floor-uuid-1');
      expect(result).toHaveLength(1);
      expect(repository.findByFloor).toHaveBeenCalledWith('floor-uuid-1');
    });
  });

  describe('findByType', () => {
    it('should return rooms by type', async () => {
      repository.findByType.mockResolvedValue([mockRoom] as any);
      const result = await service.findByType('CLASSROOM' as any);
      expect(result).toHaveLength(1);
      expect(repository.findByType).toHaveBeenCalledWith('CLASSROOM');
    });
  });

  describe('update', () => {
    it('should update and return room when found', async () => {
      const updated = { ...mockRoom, name: 'Sala B101' };
      repository.findById.mockResolvedValue(mockRoom as any);
      repository.update.mockResolvedValue(updated as any);
      const result = await service.update('room-uuid-1', { name: 'Sala B101' });
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when room not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update('non-existent', { name: 'Sala B101' })).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete and return room when found', async () => {
      repository.findById.mockResolvedValue(mockRoom as any);
      repository.delete.mockResolvedValue(mockRoom as any);
      const result = await service.delete('room-uuid-1');
      expect(result).toEqual(mockRoom);
    });

    it('should throw NotFoundException when room not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
