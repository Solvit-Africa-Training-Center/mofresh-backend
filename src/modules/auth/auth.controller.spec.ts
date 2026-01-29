import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { UserRole } from '@prisma/client';  

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            resendOtp: jest.fn(),
            verifyOtp: jest.fn(),
          },
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should call AuthService login method', async () => {
      const loginDto = { email: 'test@example.com', password: 'password' };
      const result = { 
        status: 'otp_sent', 
        message: 'Verification code sent to email.',
        email: 'test@example.com'  
      };
      
      jest.spyOn(authService, 'login').mockResolvedValue(result);

      const response = await authController.login(loginDto);
      expect(response).toEqual(result);
      expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password');
    });
  });

  describe('resendOtp', () => {
    it('should call AuthService resendOtp method', async () => {
      const resendOtpDto: ResendOtpDto = { email: 'test@example.com' };
      const result = { 
        status: 'otp_sent', 
        message: 'Verification code sent to email.',
        email: 'test@example.com'  
      };
      
      jest.spyOn(authService, 'resendOtp').mockResolvedValue(result);

      const response = await authController.resendOtp(resendOtpDto);
      expect(response).toEqual(result);
      expect(authService.resendOtp).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('verifyOtp', () => {
    it('should call AuthService verifyOtp method', async () => {
      const verifyOtpDto: VerifyOtpDto = { email: 'test@example.com', code: '123456' };
      
      
      const result = { 
        status: 'success', 
        token: 'jwt_token', 
        user: { 
          id: '1', 
          email: 'test@example.com', 
          firstName: 'John', 
          lastName: 'Doe', 
          phone: '123-456-7890', 
          role: UserRole.SUPPLIER,  
          siteId: null,  
          isActive: true, 
          createdAt: new Date(), 
          updatedAt: new Date(),
        } 
      };
      
      jest.spyOn(authService, 'verifyOtp').mockResolvedValue(result);

      const response = await authController.verifyOtp(verifyOtpDto);
      expect(response).toEqual(result);
      expect(authService.verifyOtp).toHaveBeenCalledWith('test@example.com', '123456');
    });
  });
});
