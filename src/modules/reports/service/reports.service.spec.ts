import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsRepository } from '../repository/reports.repository';

describe('ReportsService', () => {
  let service: ReportsService;
  let repository: jest.Mocked<ReportsRepository>;

  const mockReport = {
    id: 'report-uuid-1',
    type: 'ENERGY_CONSUMPTION',
    title: 'Consumo de Energia - Janeiro 2025',
    format: 'PDF',
    status: 'PENDING',
    filters: { startDate: '2025-01-01', endDate: '2025-01-31' },
    fileUrl: null,
    createdById: 'user-uuid-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: ReportsRepository,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            findByCreator: jest.fn(),
            findByType: jest.fn(),
            findByStatus: jest.fn(),
            update: jest.fn(),
            updateStatus: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    repository = module.get(ReportsRepository);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and return report', async () => {
      repository.create.mockResolvedValue(mockReport as any);
      const dto = {
        type: 'ENERGY_CONSUMPTION' as any,
        title: 'Consumo de Energia - Janeiro 2025',
        format: 'PDF' as any,
        filters: {},
        createdById: 'user-uuid-1',
      };
      const result = await service.create(dto);
      expect(result).toEqual(mockReport);
      expect(repository.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return all reports', async () => {
      repository.findAll.mockResolvedValue([mockReport] as any);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no reports', async () => {
      repository.findAll.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return report when found', async () => {
      repository.findById.mockResolvedValue(mockReport as any);
      const result = await service.findById('report-uuid-1');
      expect(result).toEqual(mockReport);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCreator', () => {
    it('should return reports for a creator', async () => {
      repository.findByCreator.mockResolvedValue([mockReport] as any);
      const result = await service.findByCreator('user-uuid-1');
      expect(result).toHaveLength(1);
      expect(repository.findByCreator).toHaveBeenCalledWith('user-uuid-1');
    });
  });

  describe('findByType', () => {
    it('should return reports by type', async () => {
      repository.findByType.mockResolvedValue([mockReport] as any);
      const result = await service.findByType('ENERGY_CONSUMPTION' as any);
      expect(result).toHaveLength(1);
      expect(repository.findByType).toHaveBeenCalledWith('ENERGY_CONSUMPTION');
    });
  });

  describe('findByStatus', () => {
    it('should return reports by status', async () => {
      repository.findByStatus.mockResolvedValue([mockReport] as any);
      const result = await service.findByStatus('PENDING' as any);
      expect(result).toHaveLength(1);
      expect(repository.findByStatus).toHaveBeenCalledWith('PENDING');
    });
  });

  describe('update', () => {
    it('should update report when found', async () => {
      const updated = { ...mockReport, title: 'Updated Title' };
      repository.findById.mockResolvedValue(mockReport as any);
      repository.update.mockResolvedValue(updated as any);
      const result = await service.update('report-uuid-1', { title: 'Updated Title' } as any);
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when report not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.update('non-existent', {} as any)).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should update status when report found', async () => {
      const updated = { ...mockReport, status: 'COMPLETED', fileUrl: 'http://example.com/report.pdf' };
      repository.findById.mockResolvedValue(mockReport as any);
      repository.updateStatus.mockResolvedValue(updated as any);
      const result = await service.updateStatus('report-uuid-1', 'COMPLETED' as any, 'http://example.com/report.pdf');
      expect(result).toEqual(updated);
      expect(repository.updateStatus).toHaveBeenCalledWith('report-uuid-1', 'COMPLETED', 'http://example.com/report.pdf');
    });

    it('should update status without fileUrl', async () => {
      const updated = { ...mockReport, status: 'FAILED' };
      repository.findById.mockResolvedValue(mockReport as any);
      repository.updateStatus.mockResolvedValue(updated as any);
      await service.updateStatus('report-uuid-1', 'FAILED' as any);
      expect(repository.updateStatus).toHaveBeenCalledWith('report-uuid-1', 'FAILED', undefined);
    });

    it('should throw NotFoundException when report not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.updateStatus('non-existent', 'COMPLETED' as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete report when found', async () => {
      repository.findById.mockResolvedValue(mockReport as any);
      repository.delete.mockResolvedValue(mockReport as any);
      const result = await service.delete('report-uuid-1');
      expect(result).toEqual(mockReport);
    });

    it('should throw NotFoundException when report not found', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
