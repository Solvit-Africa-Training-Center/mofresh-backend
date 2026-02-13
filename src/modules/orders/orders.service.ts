import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderStatus, UserRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateOrderDto, RejectOrderDto } from './dto';
import { paginate } from '../../common/utils/paginator';

// import { StockMovementService } from '../stock-movements/stock-movements.service';

import { InvoicesService } from '../invoices/invoices.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly db: PrismaService,
    private readonly invoiceService: InvoicesService,
    // private readonly stockMovementService: StockMovementService,
  ) {}

  private getRoleBasedFilter(
    siteId: string,
    userRole: UserRole,
    userId: string,
  ): Prisma.OrderWhereInput {
    if (userRole === UserRole.SUPER_ADMIN) {
      return {};
    }

    if (userRole === UserRole.SITE_MANAGER) {
      return { siteId };
    }

    return {
      clientId: userId,
      siteId,
    };
  }

  async createOrders(clientId: string, siteId: string, createOrderDto: CreateOrderDto) {
    const { deliveryAddress, notes, items } = createOrderDto;
    const productIds = [...new Set(items.map((item) => item.productId))];

    const products = await this.db.product.findMany({
      where: {
        id: { in: productIds },
        siteId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        sellingPricePerUnit: true,
        quantityKg: true,
        status: true,
      },
    });

    if (products.length !== productIds.length) {
      const foundProductIds = products.map((p) => p.id);
      const missingProductIds = productIds.filter((id) => !foundProductIds.includes(id));
      throw new BadRequestException(
        `The following products are not available at this site: ${missingProductIds.join(', ')}`,
      );
    }

    let totalAmount = 0;
    const orderItems = items.map((item) => {
      const product = products.find((p) => p.id === item.productId);

      if (!product) {
        throw new BadRequestException(`Product ${item.productId} not found`);
      }

      if (product.quantityKg < item.quantityKg) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}". Available: ${product.quantityKg}kg, Requested: ${item.quantityKg}kg`,
        );
      }

      const subtotal = product.sellingPricePerUnit * item.quantityKg;
      totalAmount += subtotal;

      return {
        productId: item.productId,
        quantityKg: item.quantityKg,
        unitPrice: product.sellingPricePerUnit,
        subtotal,
      };
    });

    const order = await this.db.order.create({
      data: {
        clientId,
        siteId,
        deliveryAddress,
        notes,
        totalAmount,
        status: OrderStatus.REQUESTED,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unit: true,
              },
            },
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return order;
  }

  async approveOrders(orderId: string, approverId: string, siteId: string) {
    const order = await this.db.order.findFirst({
      where: {
        id: orderId,
        siteId,
        deletedAt: null,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.REQUESTED) {
      throw new BadRequestException(
        `Cannot approve order with status: ${order.status}. Only REQUESTED orders can be approved`,
      );
    }

    return await this.db.$transaction(async (tx) => {
      // await this.stockMovementService.reserveStock(order.items, approverId);
      await this.reserveStock(tx, order.items, orderId, approverId);
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.APPROVED,
          approvedBy: approverId,
          approvedAt: new Date(),
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          client: true,
        },
      });

      await this.invoiceService.generateOrderInvoice(orderId);

      return updatedOrder;
    });
  }

  private async reserveStock(
    tx: Prisma.TransactionClient,
    items: Array<{ productId: string; quantityKg: number }>,
    orderId: string,
    approverId: string,
  ) {
    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { quantityKg: true, coldRoomId: true, name: true },
      });

      if (!product || product.quantityKg < item.quantityKg) {
        throw new BadRequestException(
          `Insufficient stock for "${product?.name || item.productId}"`,
        );
      }

      await tx.product.update({
        where: { id: item.productId },
        data: {
          quantityKg: { decrement: item.quantityKg },
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          coldRoomId: product.coldRoomId,
          quantityKg: item.quantityKg,
          movementType: 'OUT',
          reason: `Order ${orderId} approved - stock reserved`,
          createdBy: approverId,
        },
      });

      await tx.coldRoom.update({
        where: { id: product.coldRoomId },
        data: {
          usedCapacityKg: { decrement: item.quantityKg },
        },
      });
    }
  }

  async rejectOrders(orderId: string, siteId: string, rejectOrderDto: RejectOrderDto) {
    const order = await this.db.order.findFirst({
      where: {
        id: orderId,
        siteId,
        deletedAt: null,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.REQUESTED) {
      throw new BadRequestException(
        `Cannot reject order with status: ${order.status}. Only REQUESTED orders can be rejected`,
      );
    }

    return await this.db.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: rejectOrderDto.rejectionReason,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        client: true,
      },
    });
  }

  async findAllOrders(
    siteId: string,
    userRole: UserRole,
    userId: string,
    status?: OrderStatus,
    page?: number,
    limit?: number,
  ) {
    const whereClause: Prisma.OrderWhereInput = {
      deletedAt: null,
      ...this.getRoleBasedFilter(siteId, userRole, userId),
    };

    if (status) {
      whereClause.status = status;
    }

    return await paginate(this.db.order, {
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      page,
      limit,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unit: true,
              },
            },
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findOne(orderId: string, siteId: string, userRole: UserRole, userId: string) {
    const whereClause: Prisma.OrderWhereInput = {
      id: orderId,
      deletedAt: null,
      ...this.getRoleBasedFilter(siteId, userRole, userId),
    };

    const order = await this.db.order.findFirst({
      where: whereClause,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unit: true,
                sellingPricePerUnit: true,
              },
            },
          },
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        invoice: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateStatus(orderId: string, siteId: string, newStatus: OrderStatus) {
    const order = await this.db.order.findFirst({
      where: {
        id: orderId,
        siteId,
        deletedAt: null,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      REQUESTED: [OrderStatus.APPROVED, OrderStatus.REJECTED],
      APPROVED: [OrderStatus.INVOICED, OrderStatus.COMPLETED],
      INVOICED: [OrderStatus.COMPLETED],
      COMPLETED: [],
      REJECTED: [],
    };

    const allowedStatuses = validTransitions[order.status];
    if (!allowedStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${newStatus}. Allowed transitions: ${allowedStatuses.join(', ') || 'none'}`,
      );
    }

    return await this.db.order.update({
      where: { id: orderId },
      data: { status: newStatus },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        client: true,
        approver: true,
      },
    });
  }

  async findByStatus(
    siteId: string,
    userRole: UserRole,
    userId: string,
    status: OrderStatus,
    page?: number,
    limit?: number,
  ) {
    return await this.findAllOrders(siteId, userRole, userId, status, page, limit);
  }
}
