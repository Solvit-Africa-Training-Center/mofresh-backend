import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './../../database/prisma.service';
import { ColdRoomStatusDto } from './dto/cold-room-status.dto';
import { CreateColdRoomDto } from './dto/create-cold-room.dto';
import { UpdateColdRoomDto } from './dto/update-cold-room.dto';
import { ColdRoomEntity } from './entities/cold-room.entity';

@Injectable()
export class ColdRoomService {
  constructor(private prisma: PrismaService) {}

  
  async create(dto: CreateColdRoomDto): Promise<ColdRoomEntity> {
    const room = await this.prisma.coldRoom.create({ data: dto });
    return new ColdRoomEntity(room);
  }


  async findAll(siteId?: string): Promise<ColdRoomEntity[]> {
    const rooms = await this.prisma.coldRoom.findMany({
      where: { deletedAt: null, ...(siteId ? { siteId } : {}) }
    });
    return rooms.map(room => new ColdRoomEntity(room));
  }


  async getOccupancyDetails(id: string): Promise<ColdRoomStatusDto> {
    const room = await this.prisma.coldRoom.findUnique({ where: { id } });

    if (!room) throw new NotFoundException('Active cold room not found');

    // Occupancy tracking & capacity validation
    return {
      totalCapacityKg: room.totalCapacityKg,
      usedCapacityKg: room.usedCapacityKg,
      availableKg: room.totalCapacityKg - room.usedCapacityKg,
      occupancyPercentage: (Number(((room.usedCapacityKg / room.totalCapacityKg) * 100).toFixed(2))),
      canAcceptMore: room.usedCapacityKg < room.totalCapacityKg
    };
  }

  async update(id: string, dto: UpdateColdRoomDto): Promise<ColdRoomEntity> {
    const updated = await this.prisma.coldRoom.update({
      where: { id },
      data: dto,
    });
    return new ColdRoomEntity(updated);
  }
}