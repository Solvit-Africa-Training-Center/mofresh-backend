import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { PrismaService } from '@/database/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { AuditLogEntity } from './dto/entities/audit-log.entity';

describe('AuditLogsController', () => {
  let auditLogsController: AuditLogsController;
  let auditLogsService: AuditLogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [
        AuditLogsService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: AuditLogsService,
          useValue: {
            createAuditLog: jest.fn(), // Mock the createAuditLog method
            getAuditLogs: jest.fn(), // Mock the getAuditLogs method
          },
        },
      ],
    }).compile();

    auditLogsController = module.get<AuditLogsController>(AuditLogsController);
    auditLogsService = module.get<AuditLogsService>(AuditLogsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAuditLog', () => {
    it('should throw BadRequestException if user is not found', async () => {
      const createAuditLogDto: CreateAuditLogDto = {
        entityType: 'Product',
        entityId: '123',
        action: AuditAction.CREATE,
        userId: 'userId',
        details: { name: 'Product1' },
      };

      (auditLogsService.createAuditLog as jest.Mock).mockRejectedValue(
        new BadRequestException('User not found'),
      );

      await expect(auditLogsController.createAuditLog(createAuditLogDto)).rejects.toThrowError(
        BadRequestException,
      );
    });

    it('should create an audit log if user exists', async () => {
      const createAuditLogDto: CreateAuditLogDto = {
        entityType: 'Product',
        entityId: '123',
        action: AuditAction.CREATE,
        userId: 'userId',
        details: { name: 'Product1' },
      };

      // Mock the user
      const user = {
        id: 'userId',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '123-456-7890',
        role: 'ADMIN',
        siteId: 'siteId1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const createdAuditLog = {
        id: 'auditLogId',
        ...createAuditLogDto,
        timestamp: new Date(),
        user,
      };

      (auditLogsService.createAuditLog as jest.Mock).mockResolvedValue(createdAuditLog);

      const result = await auditLogsController.createAuditLog(createAuditLogDto);

      expect(result).toEqual(createdAuditLog);
      expect(auditLogsService.createAuditLog).toHaveBeenCalledWith(
        'Product',
        '123',
        AuditAction.CREATE,
        'userId',
        { name: 'Product1' },
      );
    });
  });

  describe('getAuditLogs', () => {
    it('should return an array of audit logs', async () => {
      const auditLogs: AuditLogEntity[] = [
        {
          id: 'auditLogId', // Add the 'id' field to this mock
          entityType: 'Product',
          entityId: '123',
          action: AuditAction.CREATE,
          userId: 'userId',
          details: { name: 'Product1' },
          timestamp: new Date(),
          user: {
            id: 'userId',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            phone: '123-456-7890',
            role: 'ADMIN',
            siteId: 'siteId1',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ];

      (auditLogsService.getAuditLogs as jest.Mock).mockResolvedValue(auditLogs);

      const result = await auditLogsController.getAuditLogs();

      expect(result).toEqual(auditLogs);
      expect(auditLogsService.getAuditLogs).toHaveBeenCalled();
    });
  });
});
