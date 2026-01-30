import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';
import { UserRole } from '@prisma/client';

const MOCK_USER_ID = 'user-123';
const MOCK_EMAIL = 'test@example.com';
const MOCK_OTP_CODE = '123456';
const DUMMY_HASH = '$2b$10$dummy_hash_for_testing';
const MOCK_JWT_TOKEN = 'mocked_jwt_token';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: { findFirst: jest.fn(), findUnique: jest.fn() },
    otp: { findFirst: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
  };

  const mockJwtService = { sign: jest.fn() };
  const mockMailService = { sendOtpEmail: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('verifyOtp', () => {
    it('should return success and a token if OTP is valid', async () => {
      mockPrisma.otp.findFirst.mockResolvedValue({
        email: MOCK_EMAIL,
        code: MOCK_OTP_CODE,
        expiresAt: new Date(Date.now() + 60000),
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: MOCK_USER_ID,
        email: MOCK_EMAIL,
        role: UserRole.CLIENT,
        password: DUMMY_HASH,
        deletedAt: null,
      });

      mockJwtService.sign.mockReturnValue(MOCK_JWT_TOKEN);
      const result = await service.verifyOtp(MOCK_EMAIL, MOCK_OTP_CODE);

      expect(result.status).toBe('success');
      expect(result.token).toBe(MOCK_JWT_TOKEN);
      expect(result.user).not.toHaveProperty('password');
    });
  });
});
