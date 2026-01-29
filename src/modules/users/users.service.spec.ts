import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../database/prisma.service';
import { HashingUtil } from '../../common/utils/hashing.util';
import { UserRole } from '@prisma/client';

const PLAIN_VAL = 'Safe_T3st_String!55';
const HASHED_VAL = '$2b$10$hashed_variant_example';
const MOCK_EMAIL = 'test@example.com';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser = {
    id: 'user-uuid',
    email: MOCK_EMAIL,
    password: HASHED_VAL,
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.CLIENT,
    isActive: true,
  };

  const mockPrisma = {
    user: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register user successfully', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      jest.spyOn(HashingUtil, 'hash').mockResolvedValue(HASHED_VAL);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      await service.register({
        email: MOCK_EMAIL,
        password: PLAIN_VAL,
        firstName: 'John',
        lastName: 'Doe',
        phone: '+250788000000',
        role: UserRole.CLIENT,
      });

      expect(HashingUtil.hash).toHaveBeenCalledWith(PLAIN_VAL);
    });
  });
});
