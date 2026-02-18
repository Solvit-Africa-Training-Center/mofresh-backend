/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { UserRole, ProductStatus, StockMovementType, ProductCategory } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

describe('ProductsService', () => {
  let service: ProductsService;

  const mockManager = {
    userId: 'mgr-1',
    role: UserRole.SITE_MANAGER,
    siteId: 'site-a',
  };

  const createDto: CreateProductDto = {
    name: 'Fresh Tomatoes',
    category: ProductCategory.FRUITS_VEGETABLES,
    quantityKg: 50,
    unit: 'KG',
    supplierId: 'supp-uuid-123',
    coldRoomId: 'room-uuid-456',
    siteId: 'site-a',
    sellingPricePerUnit: 1200.5,
  };

  const mockProduct = {
    id: 'prod-uuid-999',
    ...createDto,
    status: ProductStatus.IN_STOCK,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockColdRoom = {
    id: 'room-uuid-456',
    siteId: 'site-a',
    usedCapacityKg: 100,
    totalCapacityKg: 1000,
    status: 'AVAILABLE',
  };

  // This mock simulates both the main prisma client and the transaction 'tx' object
  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    coldRoom: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    site: {
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
    $queryRaw: jest.fn().mockResolvedValue([{
        id: 'prod-uuid-999',
        quantityKg: 50,
        coldRoomId: 'room-uuid-456',
        deletedAt: null,
    }]),
  };

  const mockAuditService = {
    createAuditLog: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditLogsService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should allow manager to create product in their own site', async () => {
      mockPrismaService.coldRoom.findUnique.mockResolvedValue(mockColdRoom);
      mockPrismaService.product.create.mockResolvedValue(mockProduct);

      await service.create(createDto, mockManager as any);

      expect(mockPrismaService.product.create).toHaveBeenCalled();
      expect(mockPrismaService.coldRoom.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { usedCapacityKg: { increment: createDto.quantityKg } },
        }),
      );
    });

    it('should throw BadRequest if the cold room site does not match product site', async () => {
      mockPrismaService.coldRoom.findUnique.mockResolvedValue({
        ...mockColdRoom,
        siteId: 'site-different',
      });

      await expect(service.create(createDto, mockManager as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should throw ForbiddenException if manager tries to access product from another site', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue({
        ...mockProduct,
        siteId: 'site-b',
      });

      await expect(service.findOne('prod-uuid-999', mockManager as any)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('should block manager from changing the siteId of a product', async () => {
      // We use jest.spyOn to mock the internal call to findOne
      jest.spyOn(service, 'findOne').mockResolvedValue(mockProduct as any);

      const updateDto = { siteId: 'site-b' };

      await expect(service.update('prod-uuid-999', updateDto, mockManager as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should sync capacities when moving a product to a new cold room', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockProduct as any);

      const targetRoom = { 
        id: 'room-new', 
        siteId: 'site-a', 
        usedCapacityKg: 0, 
        totalCapacityKg: 1000, 
        status: 'AVAILABLE',
      };

      mockPrismaService.coldRoom.findUnique.mockResolvedValue(targetRoom);
      mockPrismaService.product.update.mockResolvedValue({ ...mockProduct, coldRoomId: 'room-new' });

      await service.update('prod-uuid-999', { coldRoomId: 'room-new' }, mockManager as any);

      // Verify Old Room decrement
      expect(mockPrismaService.coldRoom.update).toHaveBeenCalledWith(expect.objectContaining({
          where: { id: 'room-uuid-456' },
          data: { usedCapacityKg: { decrement: 50 } },
        }),
      );

      // Verify New Room increment
      expect(mockPrismaService.coldRoom.update).toHaveBeenCalledWith(expect.objectContaining({
          where: { id: 'room-new' },
          data: { usedCapacityKg: { increment: 50 } },
        }),
      );
    });
  });

  describe('adjustStock', () => {
    it('should update product quantity and log movement', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockProduct as any);
      mockPrismaService.coldRoom.findUnique.mockResolvedValue(mockColdRoom);

      const adjustDto: AdjustStockDto = {
        quantityKg: 20,
        movementType: StockMovementType.IN,
        reason: 'Restock',
      };

      await service.adjustStock('prod-uuid-999', adjustDto, mockManager as any);

      expect(mockPrismaService.product.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should return the success message and decrement capacity', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.remove('prod-uuid-999', mockManager as any);

      expect(result.message).toBe('Product deleted successfully');
      expect(mockPrismaService.coldRoom.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { usedCapacityKg: { decrement: mockProduct.quantityKg } },
        }),
      );
    });
  });
});