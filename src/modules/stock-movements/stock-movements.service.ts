/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StockMovementType, UserRole } from '@prisma/client';

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordMovement(dto: any, user: any) {
    const { productId, coldRoomId, quantityKg, movementType, reason } = dto;

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const coldRoom = await this.prisma.coldRoom.findUnique({ where: { id: coldRoomId } });
    if (!coldRoom) throw new NotFoundException('Cold room not found');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (user.role === UserRole.SITE_MANAGER) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (product.siteId !== user.siteId || coldRoom.siteId !== user.siteId) {
        throw new ForbiddenException('You can only record movements for your own site.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      let newQuantity = product.quantityKg;
      if (movementType === StockMovementType.IN) {
        newQuantity += quantityKg;
      } else {
        if (product.quantityKg < quantityKg) {
          throw new BadRequestException('Insufficient stock balance');
        }
        newQuantity -= quantityKg;
      }

      await tx.product.update({
        where: { id: productId },
        data: { quantityKg: newQuantity },
      });

      return tx.stockMovement.create({
        data: {
          productId,

          coldRoomId,

          quantityKg,

          movementType,

          reason,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          createdBy: user.userId,
        },
        include: { product: true },
      });
    });
  }

  async revertMovement(movementId: string, user: any) {
    return this.prisma.$transaction(async (tx) => {
      const originalMovement = await tx.stockMovement.findUnique({
        where: { id: movementId },
        include: { product: true },
      });

      if (!originalMovement) throw new NotFoundException('Movement record not found');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (user.role === UserRole.SITE_MANAGER && originalMovement.product.siteId !== user.siteId) {
        throw new ForbiddenException('You cannot revert movements for other sites.');
      }

      const isRevertingAddition = originalMovement.movementType === StockMovementType.IN;
      const adjustment = isRevertingAddition
        ? -originalMovement.quantityKg
        : originalMovement.quantityKg;

      if (
        isRevertingAddition &&
        originalMovement.product.quantityKg < originalMovement.quantityKg
      ) {
        throw new BadRequestException('Cannot revert: resulting stock would be negative');
      }

      await tx.product.update({
        where: { id: originalMovement.productId },
        data: { quantityKg: { increment: adjustment } },
      });

      return tx.stockMovement.create({
        data: {
          productId: originalMovement.productId,
          coldRoomId: originalMovement.coldRoomId,
          quantityKg: originalMovement.quantityKg,
          movementType: isRevertingAddition ? StockMovementType.OUT : StockMovementType.IN,
          reason: `REVERSAL of movement ID: ${movementId}`,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          createdBy: user.userId,
        },
      });
    });
  }

  async findAll(filters: any, user: any) {
    const { productId, coldRoomId, movementType, dateFrom, dateTo, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;
    const where: any = {};

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (user.role === UserRole.SITE_MANAGER) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      where.product = { siteId: user.siteId };
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (productId) where.productId = productId;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (coldRoomId) where.coldRoomId = coldRoomId;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (movementType) where.movementType = movementType;

    if (dateFrom || dateTo) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      where.createdAt = {};
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { name: true, unit: true, siteId: true } },
          coldRoom: { select: { name: true } },
          user: { select: { firstName: true, lastName: true } },
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      data,
      pagination: { total, page, limit: Number(limit), totalPages: Math.ceil(total / limit) },
    };
  }
}
