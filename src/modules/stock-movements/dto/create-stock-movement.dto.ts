import { IsUUID, IsNumber, IsEnum, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStockMovementDto {
  @ApiProperty({ example: 'uuid-product-1' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0.1)
  quantityKg: number;

  @ApiProperty({ example: 'IN', enum: ['IN', 'OUT'] })
  @IsEnum(['IN', 'OUT'])
  movementType: 'IN' | 'OUT';

  @ApiProperty({ example: 'Received new delivery' })
  @IsString()
  reason: string;
}