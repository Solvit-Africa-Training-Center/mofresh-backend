import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderStatus } from '@prisma/client';

describe('OrdersController', () => {
    let controller: OrdersController;
    let service: OrdersService;

    const mockOrdersService = {
        createOrders: jest.fn(),
        findAllOrders: jest.fn(),
        findOne: jest.fn(),
        approveOrders: jest.fn(),
        rejectOrders: jest.fn(),
        updateStatus: jest.fn(),
        findByStatus: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [OrdersController],
            providers: [
                {
                    provide: OrdersService,
                    useValue: mockOrdersService,
                },
            ],
        }).compile();

        controller = module.get<OrdersController>(OrdersController);
        service = module.get<OrdersService>(OrdersService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create an order', async () => {
            const createOrderDto = {
                deliveryAddress: '123 Main St',
                notes: 'Test order',
                items: [{ productId: 'product-1', quantityKg: 10 }],
            };

            const mockRequest = {
                user: { id: 'client-123', siteId: 'site-123' },
            };

            const mockOrder = {
                id: 'order-123',
                ...createOrderDto,
                status: OrderStatus.REQUESTED,
            };

            mockOrdersService.createOrders.mockResolvedValue(mockOrder);

            const result = await controller.create(mockRequest, createOrderDto);

            expect(result).toEqual(mockOrder);
            expect(service.createOrders).toHaveBeenCalledWith(
                'client-123',
                'site-123',
                createOrderDto,
            );
        });

        it('should use fallback values when user is undefined', async () => {
            const createOrderDto = {
                deliveryAddress: '123 Main St',
                notes: 'Test order',
                items: [{ productId: 'product-1', quantityKg: 10 }],
            };

            const mockRequest = { user: undefined };

            const mockOrder = {
                id: 'order-123',
                ...createOrderDto,
                status: OrderStatus.REQUESTED,
            };

            mockOrdersService.createOrders.mockResolvedValue(mockOrder);

            const result = await controller.create(mockRequest, createOrderDto);

            expect(result).toEqual(mockOrder);
            expect(service.createOrders).toHaveBeenCalledWith(
                'temp-client-id',
                'temp-site-id',
                createOrderDto,
            );
        });
    });

    describe('findAll', () => {
        it('should return all orders', async () => {
            const mockRequest = {
                user: { siteId: 'site-123', role: 'SITE_MANAGER' },
            };

            const mockOrders = [
                { id: 'order-1', status: OrderStatus.REQUESTED },
                { id: 'order-2', status: OrderStatus.APPROVED },
            ];

            mockOrdersService.findAllOrders.mockResolvedValue(mockOrders);

            const result = await controller.findAll(mockRequest);

            expect(result).toEqual(mockOrders);
            expect(service.findAllOrders).toHaveBeenCalledWith(
                'site-123',
                undefined,
                undefined,
            );
        });

        it('should filter by client for CLIENT role', async () => {
            const mockRequest = {
                user: { id: 'client-123', siteId: 'site-123', role: 'CLIENT' },
            };

            mockOrdersService.findAllOrders.mockResolvedValue([]);

            await controller.findAll(mockRequest);

            expect(service.findAllOrders).toHaveBeenCalledWith(
                'site-123',
                'client-123',
                undefined,
            );
        });

        it('should use fallback siteId when user is undefined', async () => {
            const mockRequest = { user: undefined };

            mockOrdersService.findAllOrders.mockResolvedValue([]);

            await controller.findAll(mockRequest);

            expect(service.findAllOrders).toHaveBeenCalledWith(
                'temp-site-id',
                undefined,
                undefined,
            );
        });

        it('should pass status parameter when provided', async () => {
            const mockRequest = {
                user: { siteId: 'site-123', role: 'SITE_MANAGER' },
            };

            const mockOrders = [{ id: 'order-1', status: OrderStatus.APPROVED }];

            mockOrdersService.findAllOrders.mockResolvedValue(mockOrders);

            const result = await controller.findAll(mockRequest, OrderStatus.APPROVED);

            expect(result).toEqual(mockOrders);
            expect(service.findAllOrders).toHaveBeenCalledWith(
                'site-123',
                undefined,
                OrderStatus.APPROVED,
            );
        });
    });

    describe('findOne', () => {
        it('should return order by id', async () => {
            const mockRequest = {
                user: { siteId: 'site-123' },
            };

            const mockOrder = { id: 'order-123', status: OrderStatus.REQUESTED };

            mockOrdersService.findOne.mockResolvedValue(mockOrder);

            const result = await controller.findOne('order-123', mockRequest);

            expect(result).toEqual(mockOrder);
            expect(service.findOne).toHaveBeenCalledWith('order-123', 'site-123');
        });

        it('should use fallback siteId when user is undefined', async () => {
            const mockRequest = { user: undefined };

            const mockOrder = { id: 'order-123', status: OrderStatus.REQUESTED };

            mockOrdersService.findOne.mockResolvedValue(mockOrder);

            const result = await controller.findOne('order-123', mockRequest);

            expect(result).toEqual(mockOrder);
            expect(service.findOne).toHaveBeenCalledWith('order-123', 'temp-site-id');
        });
    });

    describe('approve', () => {
        it('should approve an order', async () => {
            const mockRequest = {
                user: { id: 'manager-123', siteId: 'site-123' },
            };

            const mockOrder = {
                id: 'order-123',
                status: OrderStatus.APPROVED,
            };

            mockOrdersService.approveOrders.mockResolvedValue(mockOrder);

            const result = await controller.approve('order-123', mockRequest);

            expect(result).toEqual(mockOrder);
            expect(service.approveOrders).toHaveBeenCalledWith(
                'order-123',
                'manager-123',
                'site-123',
            );
        });

        it('should use fallback values when user is undefined', async () => {
            const mockRequest = { user: undefined };

            const mockOrder = {
                id: 'order-123',
                status: OrderStatus.APPROVED,
            };

            mockOrdersService.approveOrders.mockResolvedValue(mockOrder);

            const result = await controller.approve('order-123', mockRequest);

            expect(result).toEqual(mockOrder);
            expect(service.approveOrders).toHaveBeenCalledWith(
                'order-123',
                'temp-approver-id',
                'temp-site-id',
            );
        });
    });

    describe('reject', () => {
        it('should reject an order', async () => {
            const mockRequest = {
                user: { siteId: 'site-123' },
            };

            const rejectDto = { rejectionReason: 'Insufficient stock' };

            const mockOrder = {
                id: 'order-123',
                status: OrderStatus.REJECTED,
                rejectionReason: rejectDto.rejectionReason,
            };

            mockOrdersService.rejectOrders.mockResolvedValue(mockOrder);

            const result = await controller.reject('order-123', mockRequest, rejectDto);

            expect(result).toEqual(mockOrder);
            expect(service.rejectOrders).toHaveBeenCalledWith(
                'order-123',
                'site-123',
                rejectDto,
            );
        });

        it('should use fallback siteId when user is undefined', async () => {
            const mockRequest = { user: undefined };

            const rejectDto = { rejectionReason: 'Insufficient stock' };

            const mockOrder = {
                id: 'order-123',
                status: OrderStatus.REJECTED,
                rejectionReason: rejectDto.rejectionReason,
            };

            mockOrdersService.rejectOrders.mockResolvedValue(mockOrder);

            const result = await controller.reject('order-123', mockRequest, rejectDto);

            expect(result).toEqual(mockOrder);
            expect(service.rejectOrders).toHaveBeenCalledWith(
                'order-123',
                'temp-site-id',
                rejectDto,
            );
        });
    });

    describe('findByStatus', () => {
        it('should return orders by status', async () => {
            const mockRequest = {
                user: { siteId: 'site-123' },
            };

            const mockOrders = [{ id: 'order-1', status: OrderStatus.REQUESTED }];

            mockOrdersService.findByStatus.mockResolvedValue(mockOrders);

            const result = await controller.findByStatus(
                OrderStatus.REQUESTED,
                mockRequest,
            );

            expect(result).toEqual(mockOrders);
            expect(service.findByStatus).toHaveBeenCalledWith(
                'site-123',
                OrderStatus.REQUESTED,
            );
        });

        it('should use fallback siteId when user is undefined', async () => {
            const mockRequest = { user: undefined };

            const mockOrders = [{ id: 'order-1', status: OrderStatus.REQUESTED }];

            mockOrdersService.findByStatus.mockResolvedValue(mockOrders);

            const result = await controller.findByStatus(
                OrderStatus.REQUESTED,
                mockRequest,
            );

            expect(result).toEqual(mockOrders);
            expect(service.findByStatus).toHaveBeenCalledWith(
                'temp-site-id',
                OrderStatus.REQUESTED,
            );
        });
    });
});
