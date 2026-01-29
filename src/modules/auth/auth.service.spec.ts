import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../mail/mail.service';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { randomInt } from 'crypto';
import { HashingUtil } from '../../common/utils/hashing.util';

jest.mock('crypto');

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let mailService: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: { findFirst: jest.fn(), findUnique: jest.fn() },
            otp: { create: jest.fn(), deleteMany: jest.fn(), findFirst: jest.fn() },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: { sendOtpEmail: jest.fn() },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    mailService = module.get<MailService>(MailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyOtp', () => {
    it('should return a success response with a JWT token if OTP is valid', async () => {
      const user = { id: '1', email: 'test@example.com', role: 'user', password: 'hashedpassword' };
      const otp = { email: 'test@example.com', code: '123456', expiresAt: new Date(Date.now() + 100000) };

     
      (prismaService.otp.findFirst as jest.Mock).mockResolvedValue(otp); 
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);

     
      (jwtService.sign as jest.Mock).mockReturnValue('mocked_jwt_token'); 

      const result = await authService.verifyOtp('test@example.com', '123456');

      expect(result.status).toBe('success');
      expect(result.token).toBe('mocked_jwt_token');
      expect(result.user.email).toBe('test@example.com');
    });
  });
});
