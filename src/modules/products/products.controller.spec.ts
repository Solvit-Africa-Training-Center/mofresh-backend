import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { UserRole, ProductCategory, StockMovementType } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductsService;

  const mockUser = {
    userId: 'user-uuid-123',
    role: UserRole.SITE_MANAGER,
    siteId: 'site-a',
  };

  const mockProduct = {
    id: 'prod-uuid-999',
    name: 'Organic Carrots',
    category: ProductCategory.FRUITS_VEGETABLES,
    quantityKg: 100,
    siteId: 'site-a',
  };

  const mockProductsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    adjustStock: jest.fn(),
    remove: jest.fn(),
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call service.create with dto and user context', async () => {
      const dto: CreateProductDto = {
        name: 'Organic Carrots',
        category: ProductCategory.FRUITS_VEGETABLES,
        quantityKg: 50,
        unit: 'KG',
        supplierId: 'supp-1',
        coldRoomId: 'room-1',
        siteId: 'site-a',
        sellingPricePerUnit: 15.5,
      };
      mockProductsService.create.mockResolvedValue(mockProduct);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await controller.create(dto, mockUser as any);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.create).toHaveBeenCalledWith(dto, mockUser);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with query filters and user context', async () => {
      const siteId = 'site-a';
      const category = ProductCategory.FRUITS_VEGETABLES;
      mockProductsService.findAll.mockResolvedValue([mockProduct]);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await controller.findAll(mockUser as any, siteId, category);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.findAll).toHaveBeenCalledWith(mockUser, siteId, category);
      expect(result).toEqual([mockProduct]);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with id and user context', async () => {
      const id = 'prod-uuid-999';
      mockProductsService.findOne.mockResolvedValue(mockProduct);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await controller.findOne(id, mockUser as any);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.findOne).toHaveBeenCalledWith(id, mockUser);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('update', () => {
    it('should call service.update with id, dto, and user context', async () => {
      const id = 'prod-uuid-999';
      const dto: UpdateProductDto = { name: 'Premium Carrots' };
      mockProductsService.update.mockResolvedValue({ ...mockProduct, ...dto });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await controller.update(id, dto, mockUser as any);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.update).toHaveBeenCalledWith(id, dto, mockUser);
      expect(result.name).toBe('Premium Carrots');
    });
  });

  describe('adjustStock', () => {
    it('should call service.adjustStock for atomic stock movements', async () => {
      const id = 'prod-uuid-999';
      const dto: AdjustStockDto = {
        quantityKg: 20,
        movementType: StockMovementType.IN,
        reason: 'Restock from Supplier',
      };
      mockProductsService.adjustStock.mockResolvedValue(mockProduct);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await controller.adjustStock(id, dto, mockUser as any);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.adjustStock).toHaveBeenCalledWith(id, dto, mockUser);
      expect(result).toEqual(mockProduct);
    });
  });

  describe('remove', () => {
    it('should call service.remove and return success response', async () => {
      const id = 'prod-uuid-999';
      const response = { message: 'Product deleted successfully' };
      mockProductsService.remove.mockResolvedValue(response);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const result = await controller.remove(id, mockUser as any);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.remove).toHaveBeenCalledWith(id, mockUser);
      expect(result).toEqual(response);
    });
  });
});
