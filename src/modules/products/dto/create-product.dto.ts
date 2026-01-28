import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Fresh Tomatoes' })
  @IsString() @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Vegetables', nullable: true })
  @IsString() @IsOptional()
  category?: string;

  @ApiProperty({ example: 500 })
  @IsNumber() @Min(0)
  quantityKg: number;

  @ApiProperty({ example: 'KG' })
  @IsString() @IsNotEmpty()
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

  @ApiProperty({ example: 1200.50 })
  @IsNumber() @Min(0)
  sellingPricePerUnit: number;
}