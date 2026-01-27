import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { HashingUtil } from '../common/utils/hashing.util';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: CreateUserDto) {
    
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { phone: dto.phone }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email or phone number already in use');
    }

    
    const hashedPassword = await HashingUtil.hash(dto.password);

    
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role,
        siteId: dto.siteId || null,
        isActive: true,
      },
    });

    
    const { password, ...userWithoutPassword } = user;

    return {
      status: 'success',
      message: 'User registered successfully. Verification email sent.',
      data: userWithoutPassword,
    };
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        siteId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return {
      status: 'success',
      message: 'Users fetched successfully',
      data: users,
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) throw new NotFoundException('User not found');
    
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
