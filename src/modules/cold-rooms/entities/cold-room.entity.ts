import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PowerType, AssetStatus } from '@prisma/client';
import { ProductEntity } from '@/modules/products/entities/product.entity';

export class ColdRoomEntity {
  @ApiProperty({ example: 'uuid-room-101' })
  id: string;

  @ApiProperty({ example: 'Main Kigali Freezer' })
  name: string;

  @ApiProperty({ example: 'uuid-site-789' })
  siteId: string;

  @ApiProperty({ example: 1000.0 })
  totalCapacityKg: number;

  @ApiProperty({ example: 0.0 })
  usedCapacityKg: number;

  @ApiProperty({ example: 2.5 })
  temperatureMin: number;

  @ApiProperty({ example: 8.0, nullable: true })
  temperatureMax: number | null;

  @ApiProperty({
    enum: PowerType,
    example: 'GRID',
    description: 'The primary power source for this unit',
  })
  powerType: PowerType;

  @ApiProperty({
    enum: AssetStatus,
    example: AssetStatus.AVAILABLE,
    description: 'Current operational status of the cold room',
  })
  status: AssetStatus;

  @ApiPropertyOptional({
    example: 'https://storage.googleapis.com/mofresh/coldroom-1.jpg',
    nullable: true,
  })
  imageUrl: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ nullable: true })
  deletedAt: Date | null;

  @ApiPropertyOptional({ type: () => [ProductEntity] })
  products?: ProductEntity[];

  constructor(partial: Partial<ColdRoomEntity>) {
    Object.assign(this, partial);
  }
}
