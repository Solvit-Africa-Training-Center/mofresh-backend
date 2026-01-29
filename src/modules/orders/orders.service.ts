import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderStatus, UserRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateOrderDto, RejectOrderDto } from './dto';

// import { StockMovementService } from '../stock-movements/stock-movements.service';

// import { InvoicesService } from '../invoices/invoices.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly db: PrismaService,
    // private readonly stockMovementService: StockMovementService,
    // private readonly invoiceService: InvoicesService,
  ) {}

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

      // await this.invoiceService.generateOrderInvoice(orderId);

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

  async findAllOrders(siteId: string, userRole: UserRole, userId: string, status?: OrderStatus) {
    const whereClause: Prisma.OrderWhereInput = {
      deletedAt: null,
    };

    if (userRole === UserRole.SUPER_ADMIN) {
      // Super admin can see all orders
      if (status) whereClause.status = status;
    } else if (userRole === UserRole.SITE_MANAGER) {
      // Site manager can see all orders at their site
      whereClause.siteId = siteId;
      if (status) whereClause.status = status;
    } else if (userRole === UserRole.CLIENT) {
      // Client can only see their own orders
      whereClause.clientId = userId;
      whereClause.siteId = siteId;
      if (status) whereClause.status = status;
    } else {
      // Default: restrict to user's own orders
      whereClause.clientId = userId;
      whereClause.siteId = siteId;
      if (status) whereClause.status = status;
    }

    return await this.db.order.findMany({
      where: whereClause,
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
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(orderId: string, siteId: string, userRole: UserRole, userId: string) {
    const whereClause: Prisma.OrderWhereInput = {
      id: orderId,
      deletedAt: null,
    };

    if (userRole === UserRole.SUPER_ADMIN) {
      // Super admin can view any order
    } else if (userRole === UserRole.SITE_MANAGER) {
      // Site manager can view any order at their site
      whereClause.siteId = siteId;
    } else if (userRole === UserRole.CLIENT) {
      // Client can only view their own orders
      whereClause.clientId = userId;
      whereClause.siteId = siteId;
    } else {
      // Default: restrict to user's own orders
      whereClause.clientId = userId;
      whereClause.siteId = siteId;
    }

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

  async findByStatus(siteId: string, userRole: UserRole, userId: string, status: OrderStatus) {
    return await this.findAllOrders(siteId, userRole, userId, status);
  }
}
