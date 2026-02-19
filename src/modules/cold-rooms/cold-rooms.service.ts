import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from './../../database/prisma.service';
import { UserRole, AuditAction, Prisma } from '@prisma/client';
import { ColdRoomStatusDto } from './dto/cold-room-status.dto';
import { CreateColdRoomDto } from './dto/create-cold-room.dto';
import { UpdateColdRoomDto } from './dto/update-cold-room.dto';
import { ColdRoomEntity } from './entities/cold-room.entity';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class ColdRoomService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditLogsService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(
    dto: CreateColdRoomDto,
    user: CurrentUserPayload,
    image?: Express.Multer.File,
  ): Promise<ColdRoomEntity> {
    if (user.role === UserRole.SITE_MANAGER) {
      if (!user.siteId) {
        throw new BadRequestException('Your manager account is not assigned to a site.');
      }
      if (dto.siteId && dto.siteId !== user.siteId) {
        throw new ForbiddenException(
          'Unauthorized access: You cannot register a cold room for a site that is not yours.',
        );
      }

      dto.siteId = user.siteId;
    } else if (user.role === UserRole.SUPER_ADMIN && !dto.siteId) {
      throw new BadRequestException('As an Admin, you must specify a siteId in the request body.');
    }

    const site = await this.prisma.site.findUnique({
      where: { id: dto.siteId },
    });

    if (!site) {
      throw new NotFoundException(`Site with ID ${dto.siteId} does not exist.`);
    }

    let imageUrl: string | undefined;
    if (image) {
      const uploadResult = await this.cloudinaryService.uploadFile(image, 'mofresh-cold-rooms');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      imageUrl = uploadResult.secure_url;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-assignment
    const { image: _image, ...roomData } = dto;

    const room = await this.prisma.coldRoom.create({
      data: {
        ...roomData,
        ...(imageUrl && { imageUrl }),
      },
    });

    await this.auditService.createAuditLog(user.userId, AuditAction.CREATE, 'ColdRoom', room.id, {
      coldRoomName: room.name,
      siteId: dto.siteId,
      capacityKg: dto.totalCapacityKg,
    });

    return new ColdRoomEntity(room);
  }

  async findAll(user: CurrentUserPayload, siteId?: string): Promise<ColdRoomEntity[]> {
    const where: Prisma.ColdRoomWhereInput = { deletedAt: null };
    if (user.role === UserRole.SITE_MANAGER) {
      if (siteId && siteId !== user.siteId) {
        throw new ForbiddenException(
          `Unauthorized access: You are only allowed to view rooms for site ${user.siteId}`,
        );
      }
      where.siteId = user.siteId;
    } else if (siteId) {
      where.siteId = siteId;
    }

    const rooms = await this.prisma.coldRoom.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return rooms.map((room) => new ColdRoomEntity(room));
  }

  async findOne(id: string, user: CurrentUserPayload): Promise<ColdRoomEntity> {
    const room = await this.prisma.coldRoom.findUnique({
      where: { id, deletedAt: null },
    });

    if (!room) throw new NotFoundException('Cold room not found');

    if (user.role === UserRole.SITE_MANAGER && room.siteId !== user.siteId) {
      throw new ForbiddenException('Access denied: This room belongs to another site');
    }

    return new ColdRoomEntity(room);
  }

  async getOccupancyDetails(id: string, user: CurrentUserPayload): Promise<ColdRoomStatusDto> {
    const room = await this.findOne(id, user);

    const availableKg = room.totalCapacityKg - room.usedCapacityKg;
    const occupancyPercentage =
      room.totalCapacityKg > 0
        ? Number(((room.usedCapacityKg / room.totalCapacityKg) * 100).toFixed(2))
        : 0;

    return {
      totalCapacityKg: room.totalCapacityKg,
      usedCapacityKg: room.usedCapacityKg,
      availableKg: availableKg >= 0 ? availableKg : 0,
      occupancyPercentage,
      canAcceptMore: room.usedCapacityKg < room.totalCapacityKg,
    };
  }

  async update(
    id: string,
    dto: UpdateColdRoomDto,
    user: CurrentUserPayload,
    image?: Express.Multer.File,
  ): Promise<ColdRoomEntity> {
    await this.findOne(id, user);
    if (user.role === UserRole.SITE_MANAGER && dto.siteId && dto.siteId !== user.siteId) {
      throw new ForbiddenException('Only an admin can reassign a cold room to a different site.');
    }

    let imageUrl: string | undefined;
    if (image) {
      const uploadResult = await this.cloudinaryService.uploadFile(image, 'mofresh-cold-rooms');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      imageUrl = uploadResult.secure_url;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-assignment
    const { image: _image, ...updateData } = dto;

    const updated = await this.prisma.coldRoom.update({
      where: { id },
      data: {
        ...updateData,
        ...(imageUrl && { imageUrl }),
      },
    });

    await this.auditService.createAuditLog(user.userId, AuditAction.UPDATE, 'ColdRoom', id, {
      coldRoomName: updated.name,
      status: updated.status,
    });
    return new ColdRoomEntity(updated);
  }

  async remove(
    type: 'tricycle' | 'coldBox' | 'coldPlate' | 'coldRoom',
    id: string,
    user: CurrentUserPayload,
  ): Promise<{ message: string }> {
    const coldRoom = await this.prisma.coldRoom.findUnique({
      where: { id },
    });

    if (!coldRoom || coldRoom.deletedAt) {
      throw new NotFoundException('Cold room not found');
    }

    if (user.role === UserRole.SITE_MANAGER && coldRoom.siteId !== user.siteId) {
      throw new ForbiddenException('You do not have permission to delete a room from another site');
    }

    await this.prisma.coldRoom.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.createAuditLog(user.userId, AuditAction.DELETE, 'ColdRoom', id, {
      name: coldRoom.name,
      siteId: coldRoom.siteId,
      reason: 'Soft deleted',
    });

    return { message: 'Cold room deleted successfully' };
  }
}
