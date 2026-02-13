import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { UserRole, StockMovementType } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockUser = {
    userId: 'user-uuid-123',
    role: UserRole.SITE_MANAGER,
    siteId: 'site-uuid-456',
  };

  const mockProductResponse = {
    id: 'prod-uuid-789',
    name: 'Yellow Passion Fruit',
    siteId: 'site-uuid-456',
    quantityKg: 100,
  };

  const mockProductsService = {
    create: jest.fn().mockResolvedValue(mockProductResponse),
    findAll: jest.fn().mockResolvedValue([mockProductResponse]),
    findOne: jest.fn().mockResolvedValue(mockProductResponse),
    update: jest.fn().mockResolvedValue({
      message: 'Product updated successfully',
      data: mockProductResponse,
    }),
    adjustStock: jest.fn().mockResolvedValue(mockProductResponse),
    remove: jest.fn().mockResolvedValue({
      message: 'Product deleted successfully',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create()', () => {
    it('should call service.create with dto and user', async () => {
      const dto: CreateProductDto = {
        name: 'Passion Fruit',
        quantityKg: 100,
        unit: 'KG',
        supplierId: 'supp-1',
        coldRoomId: 'room-1',
        siteId: 'site-a',
        sellingPricePerUnit: 500,
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await controller.create(dto, mockUser as any);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.create).toHaveBeenCalledWith(dto, mockUser);
      expect(result).toEqual(mockProductResponse);
    });
  });

  describe('findAll()', () => {
    it('should pass siteId query to the service', async () => {
      const siteId = 'site-query-id';
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await controller.findAll(mockUser as any, siteId);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.findAll).toHaveBeenCalledWith(mockUser, siteId);
    });
  });

  describe('remove()', () => {
    it('should return the "Product deleted successfully" message from service', async () => {
      const productId = 'prod-uuid-789';

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await controller.remove(productId, mockUser as any);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.remove).toHaveBeenCalledWith(productId, mockUser);
      expect(result).toEqual({ message: 'Product deleted successfully' });
    });
  });

  describe('adjustStock()', () => {
    it('should call service.adjustStock with correct params', async () => {
      const productId = 'prod-uuid-789';
      const dto: AdjustStockDto = {
        quantityKg: 20,
        movementType: StockMovementType.IN,
        reason: 'Restocking',
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await controller.adjustStock(productId, dto, mockUser as any);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.adjustStock).toHaveBeenCalledWith(productId, dto, mockUser);
    });
  });
});
