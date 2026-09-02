import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaUserRepository } from '../repository/prisma-user.repository';

jest.mock('src/utils/password.util', () => ({
  hashPassword: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
  comparePassword: jest.fn().mockResolvedValue(true),
}));

describe('UserService', () => {
  let service: UserService;
  let userRepo: jest.Mocked<PrismaUserRepository>;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'joao@email.com',
    name: 'Joao da Silva',
    password: '$2b$10$hashedpassword',
    phone: null,
    cpf: null,
    role: 'VIEWER',
    avatar: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const mockAdminUser = { ...mockUser, id: 'admin-uuid-1', email: 'admin@email.com', role: 'ADMIN' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaUserRepository,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
            findAdmins: jest.fn(),
            findByCpf: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepo = module.get(PrismaUserRepository);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create user when email is not taken', async () => {
      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.create.mockResolvedValue(mockUser as any);
      const dto = { name: 'Joao', email: 'joao@email.com' };
      const result = await service.create(dto as any);
      expect(result).toEqual(mockUser);
      expect(userRepo.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when email already exists', async () => {
      userRepo.findByEmail.mockResolvedValue(mockUser as any);
      await expect(service.create({ name: 'Joao', email: 'joao@email.com' } as any)).rejects.toThrow(BadRequestException);
      expect(userRepo.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when ADMIN role without password', async () => {
      await expect(service.create({ name: 'Admin', email: 'admin@email.com', role: 'ADMIN' } as any)).rejects.toThrow(BadRequestException);
    });

    it('should hash password when provided', async () => {
      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.create.mockResolvedValue(mockUser as any);
      const dto = { name: 'Joao', email: 'joao@email.com', password: 'mypassword' };
      await service.create(dto as any);
      expect(dto.password).toBe('$2b$10$hashedpassword');
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      userRepo.findAll.mockResolvedValue([mockUser] as any);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no users', async () => {
      userRepo.findAll.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return user when found', async () => {
      userRepo.findById.mockResolvedValue(mockUser as any);
      const result = await service.findOne('user-uuid-1');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.findById.mockResolvedValue(null);
      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      userRepo.findByEmail.mockResolvedValue(mockUser as any);
      const result = await service.findByEmail('joao@email.com');
      expect(result).toEqual(mockUser);
    });

    it('should return null when email not found', async () => {
      userRepo.findByEmail.mockResolvedValue(null);
      const result = await service.findByEmail('notfound@email.com');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user when found', async () => {
      const updated = { ...mockUser, name: 'Updated Name' };
      userRepo.findById.mockResolvedValue(mockUser as any);
      userRepo.update.mockResolvedValue(updated as any);
      const result = await service.update('user-uuid-1', { name: 'Updated Name' } as any);
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.findById.mockResolvedValue(null);
      await expect(service.update('non-existent', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when upgrading to ADMIN without password', async () => {
      const userNoPassword = { ...mockUser, password: null };
      userRepo.findById.mockResolvedValue(userNoPassword as any);
      await expect(service.update('user-uuid-1', { role: 'ADMIN' } as any)).rejects.toThrow(BadRequestException);
    });

    it('should allow upgrading to ADMIN when user already has password', async () => {
      userRepo.findById.mockResolvedValue(mockUser as any);
      userRepo.update.mockResolvedValue({ ...mockUser, role: 'ADMIN' } as any);
      const result = await service.update('user-uuid-1', { role: 'ADMIN' } as any);
      expect(result.role).toBe('ADMIN');
    });

    it('should hash password when updating password', async () => {
      userRepo.findById.mockResolvedValue(mockUser as any);
      userRepo.update.mockResolvedValue(mockUser as any);
      const dto: any = { password: 'newpassword' };
      await service.update('user-uuid-1', dto);
      expect(dto.password).toBe('$2b$10$hashedpassword');
    });
  });

  describe('remove', () => {
    it('should delete user when found', async () => {
      userRepo.findById.mockResolvedValue(mockUser as any);
      userRepo.delete.mockResolvedValue(mockUser as any);
      const result = await service.remove('user-uuid-1');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepo.findById.mockResolvedValue(null);
      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAdminEmails', () => {
    it('should return array of admin email addresses', async () => {
      userRepo.findAdmins.mockResolvedValue([
        { ...mockAdminUser, email: 'admin1@email.com' },
        { ...mockAdminUser, email: 'admin2@email.com' },
      ] as any);
      const result = await service.getAdminEmails();
      expect(result).toEqual(['admin1@email.com', 'admin2@email.com']);
    });

    it('should return empty array when no admins', async () => {
      userRepo.findAdmins.mockResolvedValue([]);
      const result = await service.getAdminEmails();
      expect(result).toEqual([]);
    });
  });
});
