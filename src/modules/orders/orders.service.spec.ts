import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../database/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

describe('OrdersService', () => {
    let service: OrdersService;
    let prisma: PrismaService;

    const mockPrismaService = {
        product: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        order: {
            create: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
        },
        orderItem: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
        },
        stockMovement: {
            create: jest.fn(),
        },
        coldRoom: {
            update: jest.fn(),
        },
        $transaction: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrdersService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<OrdersService>(OrdersService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createOrders', () => {
        const clientId = 'client-123';
        const siteId = 'site-123';
        const createOrderDto = {
            deliveryAddress: '123 Main St',
            notes: 'Deliver before 10 AM',
            items: [
                { productId: 'product-1', quantityKg: 10 },
                { productId: 'product-2', quantityKg: 5 },
            ],
        };

        const mockProducts = [
            {
                id: 'product-1',
                name: 'Milk',
                sellingPricePerUnit: 1000,
                quantityKg: 100,
                status: 'IN_STOCK',
            },
            {
                id: 'product-2',
                name: 'Cheese',
                sellingPricePerUnit: 5000,
                quantityKg: 50,
                status: 'IN_STOCK',
            },
        ];

        it('should create an order successfully', async () => {
            mockPrismaService.product.findMany.mockResolvedValue(mockProducts);
            mockPrismaService.order.create.mockResolvedValue({
                id: 'order-123',
                clientId,
                siteId,
                status: OrderStatus.REQUESTED,
                totalAmount: 35000,
            });

            const result = await service.createOrders(clientId, siteId, createOrderDto);

            expect(result).toBeDefined();
            expect(mockPrismaService.product.findMany).toHaveBeenCalledWith({
                where: {
                    id: { in: ['product-1', 'product-2'] },
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
        });

        it('should throw error if products not found', async () => {
            mockPrismaService.product.findMany.mockResolvedValue([mockProducts[0]]);

            await expect(
                service.createOrders(clientId, siteId, createOrderDto),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw error if insufficient stock', async () => {
            const lowStockProducts = [
                { ...mockProducts[0], quantityKg: 5 },
                mockProducts[1],
            ];
            mockPrismaService.product.findMany.mockResolvedValue(lowStockProducts);

            await expect(
                service.createOrders(clientId, siteId, createOrderDto),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw error if product not found during mapping', async () => {
            mockPrismaService.product.findMany.mockResolvedValue([
                {
                    id: 'product-1',
                    name: 'Milk',
                    sellingPricePerUnit: 1000,
                    quantityKg: 100,
                    status: 'IN_STOCK',
                },
            ]);

            const dtoWithDuplicateButDifferentIds = {
                deliveryAddress: '123 Main St',
                notes: 'Test order',
                items: [
                    { productId: 'product-1', quantityKg: 10 },
                    { productId: 'product-1-typo', quantityKg: 5 },
                ],
            };

            await expect(
                service.createOrders(clientId, siteId, dtoWithDuplicateButDifferentIds),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('approveOrders', () => {
        const orderId = 'order-123';
        const approverId = 'manager-123';
        const siteId = 'site-123';

        const mockOrder = {
            id: orderId,
            siteId,
            status: OrderStatus.REQUESTED,
            items: [
                {
                    productId: 'product-1',
                    quantityKg: 10,
                },
            ],
        };

        it('should throw error if order not found', async () => {
            mockPrismaService.order.findFirst.mockResolvedValue(null);

            await expect(
                service.approveOrders(orderId, approverId, siteId),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw error if order not in REQUESTED status', async () => {
            mockPrismaService.order.findFirst.mockResolvedValue({
                ...mockOrder,
                status: OrderStatus.APPROVED,
            });

            await expect(
                service.approveOrders(orderId, approverId, siteId),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('rejectOrders', () => {
        const orderId = 'order-123';
        const siteId = 'site-123';
        const rejectDto = { rejectionReason: 'Insufficient stock' };

        it('should reject order successfully', async () => {
            const mockOrder = {
                id: orderId,
                status: OrderStatus.REQUESTED,
            };

            mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);
            mockPrismaService.order.update.mockResolvedValue({
                ...mockOrder,
                status: OrderStatus.REJECTED,
                rejectionReason: rejectDto.rejectionReason,
            });

            const result = await service.rejectOrders(orderId, siteId, rejectDto);

            expect(result.status).toBe(OrderStatus.REJECTED);
            expect(mockPrismaService.order.update).toHaveBeenCalled();
        });

        it('should throw error if order not found', async () => {
            mockPrismaService.order.findFirst.mockResolvedValue(null);

            await expect(
                service.rejectOrders(orderId, siteId, rejectDto),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw error if order not in REQUESTED status', async () => {
            mockPrismaService.order.findFirst.mockResolvedValue({
                id: orderId,
                status: OrderStatus.APPROVED,
            });

            await expect(
                service.rejectOrders(orderId, siteId, rejectDto),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('findAllOrders', () => {
        const siteId = 'site-123';

        it('should return all orders for site', async () => {
            const mockOrders = [
                { id: 'order-1', status: OrderStatus.REQUESTED },
                { id: 'order-2', status: OrderStatus.APPROVED },
            ];

            mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

            const result = await service.findAllOrders(siteId);

            expect(result).toHaveLength(2);
            expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ siteId }),
                }),
            );
        });

        it('should filter by status', async () => {
            const mockOrders = [{ id: 'order-1', status: OrderStatus.REQUESTED }];

            mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

            await service.findAllOrders(siteId, undefined, OrderStatus.REQUESTED);

            expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        siteId,
                        status: OrderStatus.REQUESTED,
                    }),
                }),
            );
        });
    });

    describe('findOne', () => {
        const orderId = 'order-123';
        const siteId = 'site-123';

        it('should return order by id', async () => {
            const mockOrder = { id: orderId, siteId };
            mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);

            const result = await service.findOne(orderId, siteId);

            expect(result).toEqual(mockOrder);
        });

        it('should throw error if order not found', async () => {
            mockPrismaService.order.findFirst.mockResolvedValue(null);

            await expect(service.findOne(orderId, siteId)).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('updateStatus', () => {
        const orderId = 'order-123';
        const siteId = 'site-123';

        it('should update status with valid transition', async () => {
            const mockOrder = {
                id: orderId,
                status: OrderStatus.APPROVED,
            };

            mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);
            mockPrismaService.order.update.mockResolvedValue({
                ...mockOrder,
                status: OrderStatus.INVOICED,
            });

            const result = await service.updateStatus(
                orderId,
                siteId,
                OrderStatus.INVOICED,
            );

            expect(result.status).toBe(OrderStatus.INVOICED);
        });

        it('should throw error for invalid transition', async () => {
            const mockOrder = {
                id: orderId,
                status: OrderStatus.COMPLETED,
            };

            mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);

            await expect(
                service.updateStatus(orderId, siteId, OrderStatus.REQUESTED),
            ).rejects.toThrow(BadRequestException);
        });

        it('should allow REQUESTED to APPROVED transition', async () => {
            const mockOrder = { id: orderId, status: OrderStatus.REQUESTED };
            mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);
            mockPrismaService.order.update.mockResolvedValue({
                ...mockOrder,
                status: OrderStatus.APPROVED,
            });

            const result = await service.updateStatus(orderId, siteId, OrderStatus.APPROVED);
            expect(result.status).toBe(OrderStatus.APPROVED);
        });

        it('should allow REQUESTED to REJECTED transition', async () => {
            const mockOrder = { id: orderId, status: OrderStatus.REQUESTED };
            mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);
            mockPrismaService.order.update.mockResolvedValue({
                ...mockOrder,
                status: OrderStatus.REJECTED,
            });

            const result = await service.updateStatus(orderId, siteId, OrderStatus.REJECTED);
            expect(result.status).toBe(OrderStatus.REJECTED);
        });

        it('should allow APPROVED to COMPLETED transition', async () => {
            const mockOrder = { id: orderId, status: OrderStatus.APPROVED };
            mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);
            mockPrismaService.order.update.mockResolvedValue({
                ...mockOrder,
                status: OrderStatus.COMPLETED,
            });

            const result = await service.updateStatus(orderId, siteId, OrderStatus.COMPLETED);
            expect(result.status).toBe(OrderStatus.COMPLETED);
        });

        it('should allow INVOICED to COMPLETED transition', async () => {
            const mockOrder = { id: orderId, status: OrderStatus.INVOICED };
            mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);
            mockPrismaService.order.update.mockResolvedValue({
                ...mockOrder,
                status: OrderStatus.COMPLETED,
            });

            const result = await service.updateStatus(orderId, siteId, OrderStatus.COMPLETED);
            expect(result.status).toBe(OrderStatus.COMPLETED);
        });

        it('should not allow transitions from COMPLETED', async () => {
            const mockOrder = { id: orderId, status: OrderStatus.COMPLETED };
            mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);

            await expect(
                service.updateStatus(orderId, siteId, OrderStatus.REQUESTED),
            ).rejects.toThrow(BadRequestException);
        });

        it('should not allow transitions from REJECTED', async () => {
            const mockOrder = { id: orderId, status: OrderStatus.REJECTED };
            mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);

            await expect(
                service.updateStatus(orderId, siteId, OrderStatus.APPROVED),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw error if order not found', async () => {
            mockPrismaService.order.findFirst.mockResolvedValue(null);

            await expect(
                service.updateStatus(orderId, siteId, OrderStatus.APPROVED),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('findByStatus', () => {
        const siteId = 'site-123';

        it('should call findAllOrders with status', async () => {
            const mockOrders = [{ id: 'order-1', status: OrderStatus.REQUESTED }];
            mockPrismaService.order.findMany.mockResolvedValue(mockOrders);

            const findAllSpy = jest.spyOn(service, 'findAllOrders');

            await service.findByStatus(siteId, OrderStatus.REQUESTED);

            expect(findAllSpy).toHaveBeenCalledWith(siteId, undefined, OrderStatus.REQUESTED);
        });
    });

    describe('approveOrders - transaction logic', () => {
        const orderId = 'order-123';
        const approverId = 'manager-123';
        const siteId = 'site-123';

        it('should execute full approval transaction', async () => {
            const mockOrder = {
                id: orderId,
                siteId,
                status: OrderStatus.REQUESTED,
                items: [
                    {
                        productId: 'product-1',
                        quantityKg: 10,
                        product: {
                            id: 'product-1',
                            name: 'Milk',
                            quantityKg: 100,
                            coldRoomId: 'coldroom-1',
                        },
                    },
                ],
            };

            const mockTransaction = {
                product: {
                    findUnique: jest.fn().mockResolvedValue({
                        quantityKg: 100,
                        coldRoomId: 'coldroom-1',
                        name: 'Milk',
                    }),
                    update: jest.fn().mockResolvedValue({}),
                },
                stockMovement: {
                    create: jest.fn().mockResolvedValue({}),
                },
                coldRoom: {
                    update: jest.fn().mockResolvedValue({}),
                },
                order: {
                    update: jest.fn().mockResolvedValue({
                        ...mockOrder,
                        status: OrderStatus.APPROVED,
                        approvedBy: approverId,
                        approvedAt: new Date(),
                    }),
                },
            };

            mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);
            mockPrismaService.$transaction.mockImplementation(async (callback) => {
                return await callback(mockTransaction);
            });

            const result = await service.approveOrders(orderId, approverId, siteId);

            expect(result.status).toBe(OrderStatus.APPROVED);
            expect(mockTransaction.product.update).toHaveBeenCalled();
            expect(mockTransaction.stockMovement.create).toHaveBeenCalled();
            expect(mockTransaction.coldRoom.update).toHaveBeenCalled();
        });

        it('should throw error if product not found in transaction', async () => {
            const mockOrder = {
                id: orderId,
                siteId,
                status: OrderStatus.REQUESTED,
                items: [
                    {
                        productId: 'product-1',
                        quantityKg: 10,
                    },
                ],
            };

            const mockTransaction = {
                product: {
                    findUnique: jest.fn().mockResolvedValue(null),
                },
            };

            mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);
            mockPrismaService.$transaction.mockImplementation(async (callback) => {
                return await callback(mockTransaction);
            });

            await expect(
                service.approveOrders(orderId, approverId, siteId),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw error if insufficient stock in transaction', async () => {
            const mockOrder = {
                id: orderId,
                siteId,
                status: OrderStatus.REQUESTED,
                items: [
                    {
                        productId: 'product-1',
                        quantityKg: 100,
                    },
                ],
            };

            const mockTransaction = {
                product: {
                    findUnique: jest.fn().mockResolvedValue({
                        quantityKg: 50,
                        coldRoomId: 'coldroom-1',
                        name: 'Milk',
                    }),
                },
            };

            mockPrismaService.order.findFirst.mockResolvedValue(mockOrder);
            mockPrismaService.$transaction.mockImplementation(async (callback) => {
                return await callback(mockTransaction);
            });

            await expect(
                service.approveOrders(orderId, approverId, siteId),
            ).rejects.toThrow(BadRequestException);
        });
    });
});
