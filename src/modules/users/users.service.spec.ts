import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../database/prisma.service';
import { HashingUtil } from '../../common/utils/hashing.util';
import { UserRole } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

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
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    otp: { findMany: jest.fn(), deleteMany: jest.fn() },
    site: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation((cb: (prisma: any) => unknown) => cb(mockPrisma)),
  };

  const mockMailService = {
    sendPasswordEmail: jest.fn(),
    sendOtpEmail: jest.fn(),
  };

  const mockAuditLogsService = {
    createAuditLog: jest.fn().mockResolvedValue({}),
  };

  const mockCloudinaryService = {
    uploadFile: jest.fn().mockResolvedValue({
      secure_url: 'https://cloudinary.com/mock-file-url.pdf',
      public_id: 'mock-public-id',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMailService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
        { provide: CloudinaryService, useValue: mockCloudinaryService },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register user successfully', async () => {
      const mockCreator = {
        id: 'creator-uuid',
        role: UserRole.SUPER_ADMIN,
        siteId: null,
        isActive: true,
        deletedAt: null,
      };

      const mockSite = {
        id: 'site-uuid',
        name: 'Test Site',
        location: 'Test Location',
        managerId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockPrisma.site.findUnique.mockResolvedValue(mockSite);
      mockPrisma.user.findUnique.mockResolvedValue(mockCreator);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      jest.spyOn(HashingUtil, 'hash').mockResolvedValue(HASHED_VAL);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      await service.register(
        {
          email: MOCK_EMAIL,
          password: PLAIN_VAL,
          firstName: 'John',
          lastName: 'Doe',
          phone: '+250788000000',
          role: UserRole.SUPPLIER,
          siteId: 'site-uuid',
        },
        'creator-uuid',
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(HashingUtil.hash).toHaveBeenCalledWith(PLAIN_VAL);
    });
  });
});
