/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from './../../database/prisma.service';
import { UserRole } from '@prisma/client';
import { ColdRoomStatusDto } from './dto/cold-room-status.dto';
import { CreateColdRoomDto } from './dto/create-cold-room.dto';
import { UpdateColdRoomDto } from './dto/update-cold-room.dto';
import { ColdRoomEntity } from './entities/cold-room.entity';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class ColdRoomService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateColdRoomDto, user: CurrentUserPayload) {
    if (user.role === UserRole.SITE_MANAGER) {
      if (dto.siteId && dto.siteId !== user.siteId) {
        throw new ForbiddenException(
          'Unauthorized access: You cannot register a cold room for a site that is not yours.',
        );
      }

      if (!user.siteId) {
        throw new BadRequestException('Your manager account is not assigned to a site.');
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

    const room = await this.prisma.coldRoom.create({
      data: dto,
    });
    return new ColdRoomEntity(room);
  }

  //
  async findAll(user: any, siteId?: string): Promise<ColdRoomEntity[]> {
    const where: any = { deletedAt: null };
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

  async findOne(id: string, user: any): Promise<ColdRoomEntity> {
    const room = await this.prisma.coldRoom.findUnique({
      where: { id, deletedAt: null },
    });

    if (!room) throw new NotFoundException('Cold room not found');

    if (user.role === UserRole.SITE_MANAGER && room.siteId !== user.siteId) {
      throw new ForbiddenException('Access denied: This room belongs to another site');
    }

    return new ColdRoomEntity(room);
  }

  async getOccupancyDetails(id: string, user: any): Promise<ColdRoomStatusDto> {
    const room = await this.findOne(id, user);

    return {
      totalCapacityKg: room.totalCapacityKg,
      usedCapacityKg: room.usedCapacityKg,
      availableKg: room.totalCapacityKg - room.usedCapacityKg,
      occupancyPercentage: Number(((room.usedCapacityKg / room.totalCapacityKg) * 100).toFixed(2)),
      canAcceptMore: room.usedCapacityKg < room.totalCapacityKg,
    };
  }

  async update(id: string, dto: UpdateColdRoomDto, user: any): Promise<ColdRoomEntity> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const room = await this.findOne(id, user);

    if (user.role === UserRole.SITE_MANAGER && dto.siteId && dto.siteId !== user.siteId) {
      throw new ForbiddenException('Only an admin can reassign a cold room to a different site.');
    }

    const updated = await this.prisma.coldRoom.update({
      where: { id },
      data: dto,
    });
    return new ColdRoomEntity(updated);
  }

  async remove(id: string, user: CurrentUserPayload): Promise<{ message: string }> {
    await this.findOne(id, user);

    await this.prisma.coldRoom.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Cold room deleted successfully' };
  }
}
