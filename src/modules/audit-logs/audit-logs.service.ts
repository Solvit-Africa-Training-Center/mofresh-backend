import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { AuditAction } from '@prisma/client';
import { AuditLogEntity } from './dto/entities/audit-log.entity';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async createAuditLog(
    entityType: string,
    entityId: string,
    action: AuditAction,
    userId: string,
    details?: any
  ): Promise<AuditLogEntity> {
    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      throw new BadRequestException('User not found');
    }

  
    const createdAuditLog = await this.prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        userId,
        details,
        timestamp: new Date(),
      },
      include: {
        user: true, 
      },
    });

    
    return plainToInstance(AuditLogEntity, createdAuditLog);
  }

  async getAuditLogs(): Promise<AuditLogEntity[]> {
    const auditLogs = await this.prisma.auditLog.findMany({
      include: {
        user: true, 
      },
    });

   
    return plainToInstance(AuditLogEntity, auditLogs);
  }
}
