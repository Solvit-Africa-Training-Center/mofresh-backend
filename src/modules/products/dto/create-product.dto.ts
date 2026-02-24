import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsUUID, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductCategory } from '@prisma/client';

export class CreateProductDto {
  @ApiProperty({ example: 'Fresh Tomatoes' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ProductCategory, example: 'FRUITS_VEGETABLES' })
  @IsEnum(ProductCategory)
  @IsNotEmpty({ message: 'Category must be provided' })
  category: ProductCategory;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityKg: number;

  @ApiProperty({ example: 'KG' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({ example: 'uuid-supplier-123' })
  @IsUUID()
  supplierId: string;

  @ApiProperty({ example: 'uuid-room-456' })
  @IsUUID()
  coldRoomId: string;

  @ApiProperty({ example: 'uuid-site-789' })
  @IsUUID()
  siteId: string;

  @ApiProperty({ example: 1200.5 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sellingPricePerUnit: number;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Product image file',
  })
  @IsOptional()
  image?: any;

  @ApiPropertyOptional({ example: 'Locally sourced from Huye District' })
  @IsOptional()
  @IsString()
  description?: string;
}
