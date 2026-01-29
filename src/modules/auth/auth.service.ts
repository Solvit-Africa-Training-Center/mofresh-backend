import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { HashingUtil } from '../../common/utils/hashing.util';
import { MailService } from '../mail/mail.service';
import { randomInt } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async login(email: string, password: string) {
    
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null }, 
    });

    if (!user || !(await HashingUtil.compare(password, user.password))) {
     
      throw new UnauthorizedException('Invalid email or password');
    }

   
    return this.generateAndSendOtp(user.email, user.id);
  }

  async resendOtp(email: string) {
    
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null }, 
    });

    if (!user) {
      
      throw new UnauthorizedException('User not found');
    }

    
    await this.prisma.otp.deleteMany({ where: { email } });

 
    return this.generateAndSendOtp(user.email, user.id);
  }

  private async generateAndSendOtp(email: string, userId: string) {
    
    const otpCode = randomInt(100000, 999999).toString();

   
    const expiresAt = new Date(Date.now() + 5 * 60000); 

   
    await this.prisma.otp.create({
      data: { email, code: otpCode, userId, expiresAt },
    });

    
    await this.mailService.sendOtpEmail(email, otpCode);

    return {
      status: 'otp_sent',
      message: 'Verification code sent to email.',
      email,
    };
  }

  async verifyOtp(email: string, code: string) {
    
    const otpRecord = await this.prisma.otp.findFirst({
      where: { 
        email, 
        code, 
        expiresAt: { gt: new Date() } 
      },
    });

    if (!otpRecord) {
      
      throw new BadRequestException('Invalid or expired code');
    }

  
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    
    await this.prisma.otp.deleteMany({ where: { email } });

 
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    
    const { password, deletedAt, ...userWithoutPassword } = user;

    return {
      status: 'success',
      token,
      user: userWithoutPassword, 
    };
  }
}
