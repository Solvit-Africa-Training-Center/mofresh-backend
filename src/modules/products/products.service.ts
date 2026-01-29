import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from './../../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ProductEntity } from './entities/product.entity';
import { ProductStatus, StockMovementType } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductDto, userId: string): Promise<ProductEntity> {
    return this.prisma.$transaction(async (tx) => {
      const room = await tx.coldRoom.findUnique({ where: { id: dto.coldRoomId } });
      if (!room) throw new NotFoundException('Cold room not found');
      
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
          createdBy: userId,
        },
      });

      await tx.coldRoom.update({
        where: { id: dto.coldRoomId },
        data: { usedCapacityKg: { increment: dto.quantityKg } },
      });

      return new ProductEntity(product);
    });
  }

  async adjustStock(id: string, dto: AdjustStockDto, userId: string): Promise<ProductEntity> {
    return this.prisma.$transaction(async (tx) => {
      const products = await tx.$queryRaw<any[]>`
        SELECT * FROM "products" WHERE id = ${id} FOR UPDATE
      `;
      const product = products[0];
      if (!product || product.deletedAt) throw new NotFoundException('Product not found');

      const isIncrement = dto.movementType === StockMovementType.IN;
      const weightChange = isIncrement ? dto.quantityKg : -dto.quantityKg;
      const newQuantity = product.quantityKg + weightChange;

      if (newQuantity < 0) throw new BadRequestException('Insufficient stock for this operation');

      const updated = await tx.product.update({
        where: { id },
        data: { 
          quantityKg: newQuantity,
          status: newQuantity > 0 ? ProductStatus.IN_STOCK : ProductStatus.OUT_OF_STOCK 
        },
      });

      await tx.coldRoom.update({
        where: { id: product.coldRoomId },
        data: { usedCapacityKg: { increment: weightChange } },
      });

      await tx.stockMovement.create({
        data: {

          productId: id,
          coldRoomId: product.coldRoomId,
          quantityKg: dto.quantityKg,
          movementType: dto.movementType,
          reason: dto.reason,
          createdBy: userId,
        },
      });

      return new ProductEntity(updated);
    });
  }

  async findAll(siteId?: string): Promise<ProductEntity[]> {
    const products = await this.prisma.product.findMany({
      where: { 
        deletedAt: null,
        ...(siteId ? { siteId } : {}) 
      },
      orderBy: { createdAt: 'desc' },
    });
    return products.map(p => new ProductEntity(p));
  }

 
  async findOne(id: string): Promise<ProductEntity> {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        supplier: { select: { firstName: true, lastName: true, email: true } },
        coldRoom: { select: { name: true, powerType: true } },
        site: { select: { name: true, location: true } }
      }
    });

    if (!product) throw new NotFoundException(`Product with ID ${id} not found`);
    return new ProductEntity(product);
  }

 
  async update(id: string, dto: UpdateProductDto): Promise<ProductEntity> {
  

    await this.findOne(id);

    const updated = await this.prisma.product.update({
      where: { id },
      data: dto,
    });

    return new ProductEntity(updated);
  }

 
  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);

    await this.prisma.$transaction(async (tx) => {
  
      await tx.product.update({
        where: { id },
        data: { deletedAt: new Date(), status: ProductStatus.OUT_OF_STOCK },
      });

     
      await tx.coldRoom.update({
        where: { id: product.coldRoomId },
        data: { usedCapacityKg: { decrement: product.quantityKg } },
      });
    });
  }
}