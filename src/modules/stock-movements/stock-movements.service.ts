import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: PrismaService) {}

 
  async findAll(filters: any, user: any) {
    const { 
      productId, 
      coldRoomId, 
      movementType,
      dateFrom,
      dateTo,
      page = 1, 
      limit = 20 
    } = filters;
    
    const skip = (page - 1) * limit;

    const where: any = {};

    // Site scoping
    if (user.role !== 'SUPER_ADMIN') {
      // Get products for this site only
      where.product = {
        siteId: user.siteId
      };
    }

    if (productId) where.productId = productId;
    if (coldRoomId) where.coldRoomId = coldRoomId;
    if (movementType) where.movementType = movementType;
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: {
          product: {
            select: { name: true, unit: true }
          },
          coldRoom: {
            select: { name: true }
          },
          user: {
            select: { firstName: true, lastName: true, email: true }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.stockMovement.count({ where })
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * GET MOVEMENT HISTORY FOR A SPECIFIC PRODUCT
   */
  async findByProduct(productId: string, user: any) {
    // Verify product exists and user has access
    const product = await this.prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (user.role !== 'SUPER_ADMIN' && product.siteId !== user.siteId) {
      throw new NotFoundException('Product not found');
    }

    const movements = await this.prisma.stockMovement.findMany({
      where: { productId },
      include: {
        user: {
          select: { firstName: true, lastName: true }
        },
        coldRoom: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate running balance
    let balance = 0;
    const movementsWithBalance = movements.reverse().map(movement => {
      if (movement.movementType === 'IN') {
        balance += movement.quantityKg;
      } else {
        balance -= movement.quantityKg;
      }
      return {
        ...movement,
        balanceAfter: balance
      };
    }).reverse();

    return {
      product: {
        id: product.id,
        name: product.name,
        currentQuantity: product.quantityKg
      },
      movements: movementsWithBalance
    };
  }

  
}