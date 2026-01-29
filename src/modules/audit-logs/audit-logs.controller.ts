import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogEntity } from './dto/entities/audit-log.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@ApiTags('audit-logs')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Post()
  @ApiResponse({ status: 201, description: 'Audit log created', type: AuditLogEntity })
  async createAuditLog(
    @Body() createAuditLogDto: CreateAuditLogDto
  ): Promise<AuditLogEntity> {
    return this.auditLogsService.createAuditLog(
      createAuditLogDto.entityType,
      createAuditLogDto.entityId,
      createAuditLogDto.action,
      createAuditLogDto.userId,
      createAuditLogDto.details
    );
  }

  @Get()
  @ApiResponse({ status: 200, description: 'Get all audit logs', type: [AuditLogEntity] })
  async getAuditLogs(): Promise<AuditLogEntity[]> {
    return this.auditLogsService.getAuditLogs();
  }
}
