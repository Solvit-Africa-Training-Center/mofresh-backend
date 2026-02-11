import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from './../../database/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { HashingUtil } from '../../common/utils/hashing.util';
import { UserRole, Prisma, AuditAction } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { PasswordGeneratorUtil } from '../../common/utils/password-generator.util';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async register(dto: CreateUserDto, createdByUserId?: string) {
    if (dto.role !== UserRole.CLIENT && !createdByUserId) {
      throw new UnauthorizedException(
        `Registration for ${dto.role} requires an administrator token.`,
      );
    }

    if (createdByUserId) {
      const creator = await this.prisma.user.findUnique({
        where: { id: createdByUserId },
        select: { role: true, siteId: true, isActive: true, deletedAt: true },
      });

      if (!creator || creator.deletedAt || !creator.isActive) {
        throw new ForbiddenException('Invalid creator account');
      }

      this.validateUserCreation(creator.role, dto.role, creator.siteId, dto.siteId);
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { phone: dto.phone }],
        deletedAt: null,
      },
    });

    if (existingUser) {
      throw new ConflictException('Email or phone number already in use');
    }

    let passwordToHash = dto.password;
    if (!passwordToHash) {
      passwordToHash = PasswordGeneratorUtil.generate(12);
      await this.mailService.sendPasswordEmail(dto.email, passwordToHash, dto.role);
    }
    const hashedPassword = await HashingUtil.hash(passwordToHash);

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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: p, refreshToken, deletedAt, ...userWithoutSensitiveData } = user;

    await this.auditLogsService.createAuditLog(
      createdByUserId || user.id,
      AuditAction.CREATE,
      'USER',
      user.id,
      { email: user.email, role: user.role },
    );

    return {
      status: 'success',
      message: 'User registered successfully.',
      data: userWithoutSensitiveData,
    };
  }

  private validateUserCreation(
    creatorRole: UserRole,
    newUserRole: UserRole,
    creatorSiteId: string | null,
    newUserSiteId: string | null,
  ) {
    if (creatorRole === UserRole.SUPER_ADMIN) return;

    if (creatorRole === UserRole.SITE_MANAGER) {
      const allowedRoles: UserRole[] = [UserRole.SUPPLIER, UserRole.CLIENT];

      if (!allowedRoles.includes(newUserRole)) {
        throw new ForbiddenException('Site managers can only register suppliers and clients');
      }
      if (creatorSiteId !== newUserSiteId) {
        throw new ForbiddenException('Site managers can only register users for their own site');
      }
      return;
    }

    throw new ForbiddenException('You do not have permission to register users');
  }

  async update(id: string, dto: UpdateUserDto, requesterId: string) {
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { role: true, siteId: true },
    });

    if (!requester) {
      throw new UnauthorizedException('User not found');
    }

    const { data: targetUser } = await this.findOne(id);

    if (requester.role === UserRole.SITE_MANAGER) {
      if (targetUser.siteId !== requester.siteId) {
        throw new ForbiddenException('You can only update users in your site');
      }
      if (dto.role && dto.role !== targetUser.role) {
        throw new ForbiddenException('Site managers cannot change user roles');
      }
    }

    if (dto.role === UserRole.SUPER_ADMIN && requester.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot promote users to SUPER_ADMIN');
    }

    const { password, ...otherData } = dto;
    const updateData: Prisma.UserUpdateInput = { ...otherData };

    if (password) {
      updateData.password = await HashingUtil.hash(password);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: p, refreshToken: r, ...data } = updatedUser;

    await this.auditLogsService.createAuditLog(requesterId, AuditAction.UPDATE, 'USER', id, {
      updatedFields: Object.keys(otherData),
    });

    return { status: 'success', data };
  }

  async findAll(requesterId: string) {
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { role: true, siteId: true },
    });

    if (!requester) {
      throw new UnauthorizedException('User not found');
    }

    const where: Prisma.UserWhereInput = { deletedAt: null };

    if (requester.role === UserRole.SITE_MANAGER && requester.siteId) {
      where.siteId = requester.siteId;
    }

    return {
      status: 'success',
      data: await this.prisma.user.findMany({ where }),
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { site: true },
    });
    if (!user) throw new NotFoundException('User not found');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, refreshToken, ...data } = user;
    return { status: 'success', data };
  }

  async remove(id: string, requesterId: string) {
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { role: true, siteId: true },
    });

    if (!requester) {
      throw new UnauthorizedException('User not found');
    }

    const { data: user } = await this.findOne(id);

    if (requester.role === UserRole.SITE_MANAGER) {
      if (user.siteId !== requester.siteId) {
        throw new ForbiddenException('You can only delete users in your site');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.otp.deleteMany({ where: { userId: id } });

      if (user.role === UserRole.SITE_MANAGER && user.siteId) {
        await tx.site.update({
          where: { id: user.siteId },
          data: { managerId: null },
        });
      }

      await tx.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          isActive: false,
          refreshToken: null,
        },
      });

      await this.auditLogsService.createAuditLog(requesterId, AuditAction.DELETE, 'USER', id, {
        reason: 'Soft deleted',
      });

      return { status: 'success', message: 'User soft deleted' };
    });
  }
}
