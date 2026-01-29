import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../database/prisma.service';
import { HashingUtil } from '../../common/utils/hashing.util';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockUser = {
    id: 'user-uuid',
    email: 'test@example.com',
    password: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+250788000000',
    role: 'CLIENT',
    siteId: 'site-uuid',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register user successfully', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      jest.spyOn(HashingUtil, 'hash').mockResolvedValue('hashed-password');
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+250788000000',
        role: 'CLIENT',
        siteId: 'site-uuid',
      });

      expect(result.status).toBe('success');
      expect(result.data.id).toBe('user-uuid');
    });

    it('should throw ConflictException if email or phone exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      await expect(service.register({
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+250788000000',
        role: 'CLIENT',
      })).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUser]);
      const result = await service.findAll();
      expect(result.data).toEqual([mockUser]);
    });
  });

  describe('findOne', () => {
    it('should return user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      const result = await service.findOne('user-uuid');
      expect(result.id).toBe('user-uuid');
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.findOne('wrong-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, firstName: 'Jane' });

      const result = await service.update('user-uuid', { firstName: 'Jane' });
      expect(result.firstName).toBe('Jane');
    });
  });

  describe('remove', () => {
    it('should soft delete user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      const deletedUser = { ...mockUser, deletedAt: new Date(), isActive: false };
      mockPrisma.user.update.mockResolvedValue(deletedUser);

      const result = await service.remove('user-uuid');
      expect(result.isActive).toBe(false);
      expect(result.deletedAt).toBeDefined();
    });
  });
});
