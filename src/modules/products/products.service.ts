import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from './../../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ProductEntity } from './entities/product.entity';
import {
  ProductStatus,
  StockMovementType,
  UserRole,
  AuditAction,
  Prisma,
  ProductCategory,
} from '@prisma/client';
import { CurrentUserPayload } from '@/common/decorators/current-user.decorator';
import { isUUID } from 'class-validator';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditLogsService,
  ) {}

  async create(dto: CreateProductDto, user: CurrentUserPayload): Promise<ProductEntity> {
    if (user.role === UserRole.SITE_MANAGER) {
      dto.siteId = user.siteId;
    }

    return this.prisma.$transaction(async (tx) => {
      const room = await tx.coldRoom.findUnique({ where: { id: dto.coldRoomId } });

      if (!room) throw new NotFoundException('Cold room not found');

      // ensuring the cold room actually belongs to the site assigned to the product
      if (room.siteId !== dto.siteId) {
        throw new BadRequestException('Selected cold room does not belong to the product site');
      }

      if (room.status !== 'AVAILABLE') {
        throw new BadRequestException(
          `Cannot add product: Cold room is currently ${room.status.toLowerCase()}`,
        );
      }

      if (room.usedCapacityKg + dto.quantityKg > room.totalCapacityKg) {
        throw new BadRequestException('Not enough space in the selected cold room');
      }

      const product = await tx.product.create({
        data: { ...dto, status: ProductStatus.IN_STOCK },
      });

      await tx.stockMovement.create({
        data: {
          productId: product.id,
          coldRoomId: dto.coldRoomId,
          quantityKg: dto.quantityKg,
          movementType: StockMovementType.IN,
          reason: 'Initial Inventory Setup',
          createdBy: user.userId,
        },
      });

      await tx.coldRoom.update({
        where: { id: dto.coldRoomId },
        data: { usedCapacityKg: { increment: dto.quantityKg } },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.CREATE,
          entityType: 'Product',
          entityId: product.id,
          userId: user.userId,
          details: {
            productName: product.name,
            siteId: product.siteId,
            quantityKg: dto.quantityKg,
          },
          timestamp: new Date(),
        },
      });

      return new ProductEntity(product);
    });
  }

  async findAll(
    user: CurrentUserPayload,
    siteId?: string,
    category?: ProductCategory,
  ): Promise<ProductEntity[]> {
    const where: Prisma.ProductWhereInput = { deletedAt: null };

    if (category) {
      where.category = category;
    }

    if (user.role === UserRole.SITE_MANAGER) {
      if (siteId && siteId !== user.siteId) {
        throw new ForbiddenException(
          `Unauthorized access: You are only managed to access products for site ${user.siteId}`,
        );
      }
      where.siteId = user.siteId;
    } else if (user.role === UserRole.SUPER_ADMIN && siteId) {
      if (!isUUID(siteId)) {
        throw new BadRequestException(`Invalid siteId format: ${siteId}`);
      }
      const siteExists = await this.prisma.site.findUnique({
        where: { id: siteId },
      });
      if (!siteExists) {
        throw new NotFoundException(`Site with ID ${siteId} does not exist`);
      }
      where.siteId = siteId;
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        site: { select: { name: true } },
        coldRoom: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return products.map((p) => new ProductEntity(p));
  }

  async findOne(id: string, user: CurrentUserPayload): Promise<ProductEntity> {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        supplier: { select: { firstName: true, lastName: true, email: true } },
        coldRoom: { select: { name: true, powerType: true } },
        site: { select: { name: true, location: true } },
      },
    });

    if (!product) throw new NotFoundException(`Product with ID ${id} not found`);

    if (user.role === UserRole.SITE_MANAGER && product.siteId !== user.siteId) {
      throw new ForbiddenException(
        'You do not have permission to access products outside your site',
      );
    }

    return new ProductEntity(product);
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    user: CurrentUserPayload,
  ): Promise<ProductEntity> {
    const existingProduct = await this.findOne(id, user);

    if (user.role === UserRole.SITE_MANAGER && dto.siteId) {
      throw new ForbiddenException('Only an admin can replace the product site');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.coldRoomId && dto.coldRoomId !== existingProduct.coldRoomId) {
        const targetRoom = await tx.coldRoom.findUnique({ where: { id: dto.coldRoomId } });
        const targetSiteId = dto.siteId || existingProduct.siteId;

        if (!targetRoom || targetRoom.siteId !== targetSiteId) {
          throw new BadRequestException('Target cold room does not belong to the correct site');
        }

        // Check Status and Space
        if (targetRoom.status !== 'AVAILABLE') {
          throw new BadRequestException(`Target room is ${targetRoom.status.toLowerCase()}`);
        }

        if (targetRoom.usedCapacityKg + existingProduct.quantityKg > targetRoom.totalCapacityKg) {
          throw new BadRequestException('Target cold room does not have enough space');
        }

        await tx.coldRoom.update({
          where: { id: existingProduct.coldRoomId },
          data: { usedCapacityKg: { decrement: existingProduct.quantityKg } },
        });

        await tx.coldRoom.update({
          where: { id: dto.coldRoomId },
          data: { usedCapacityKg: { increment: existingProduct.quantityKg } },
        });
      }

      const updated = await tx.product.update({
        where: { id },
        data: dto,
        include: {
          site: { select: { name: true } },
          coldRoom: { select: { name: true } },
        },
      });

      await this.auditService.createAuditLog(user.userId, AuditAction.UPDATE, 'Product', id, {
        productName: updated.name,
      } as Prisma.InputJsonValue);

      return new ProductEntity({
        ...updated,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        category: updated.category as ProductCategory,
      });
    });
  }

  async adjustStock(
    id: string,
    dto: AdjustStockDto,
    user: CurrentUserPayload,
  ): Promise<ProductEntity> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const currentProduct = await this.findOne(id, user);

    return this.prisma.$transaction(async (tx) => {
      const products = await tx.$queryRaw<any[]>`
        SELECT id, "quantityKg", "coldRoomId", "deletedAt" FROM "Product" WHERE id = ${id} FOR UPDATE
      `;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const product = products[0];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (!product || product.deletedAt) throw new NotFoundException('Product not found');

      const isIncrement = dto.movementType === StockMovementType.IN;
      const weightChange = isIncrement ? dto.quantityKg : -dto.quantityKg;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const newQuantity = product.quantityKg + weightChange;

      if (newQuantity < 0) throw new BadRequestException('Insufficient stock for this operation');

      if (isIncrement) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const coldRoom = await tx.coldRoom.findUnique({ where: { id: product.coldRoomId } });

        if (!coldRoom) {
          throw new NotFoundException('Associated cold room not found');
        }
        if (isIncrement) {
          if (coldRoom.status !== 'AVAILABLE') {
            throw new BadRequestException(
              `Cannot add stock: Cold room is currently ${coldRoom.status.toLowerCase()}`,
            );
          }
        }
        if (coldRoom.usedCapacityKg + dto.quantityKg > coldRoom.totalCapacityKg) {
          throw new BadRequestException(
            `Storage capacity exceeded. Available: ${coldRoom.totalCapacityKg - coldRoom.usedCapacityKg}kg, Requested: ${dto.quantityKg}kg`,
          );
        }
      }

      const updated = await tx.product.update({
        where: { id },
        data: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          quantityKg: newQuantity,
          status: newQuantity > 0 ? ProductStatus.IN_STOCK : ProductStatus.OUT_OF_STOCK,
        },
      });

      await tx.coldRoom.update({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        where: { id: product.coldRoomId },
        data: { usedCapacityKg: { increment: weightChange } },
      });

      await tx.stockMovement.create({
        data: {
          productId: id,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          coldRoomId: product.coldRoomId,
          quantityKg: dto.quantityKg,
          movementType: dto.movementType,
          reason: dto.reason,
          createdBy: user.userId,
        },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.UPDATE,
          entityType: 'StockMovement',
          entityId: id,
          userId: user.userId,
          details: {
            movementType: dto.movementType,
            quantityKg: dto.quantityKg,
            reason: dto.reason,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            newQuantity,
          },
          timestamp: new Date(),
        },
      });

      return new ProductEntity({
        ...updated,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        category: updated.category as ProductCategory,
      });
    });
  }

  async remove(id: string, user: CurrentUserPayload): Promise<{ message: string }> {
    const product = await this.prisma.product.findUnique({
      where: { id, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    if (user.role === UserRole.SITE_MANAGER && product.siteId !== user.siteId) {
      throw new ForbiddenException(
        'Unauthorized access: You can only delete products belonging to your site',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: ProductStatus.OUT_OF_STOCK,
        },
      });

      await tx.coldRoom.update({
        where: { id: product.coldRoomId },
        data: { usedCapacityKg: { decrement: product.quantityKg } },
      });

      await tx.auditLog.create({
        data: {
          action: AuditAction.DELETE,
          entityType: 'Product',
          entityId: id,
          userId: user.userId,
          details: { productName: product.name, quantityKg: product.quantityKg },
          timestamp: new Date(),
        },
      });
    });

    return { message: 'Product deleted successfully' };
  }
}
