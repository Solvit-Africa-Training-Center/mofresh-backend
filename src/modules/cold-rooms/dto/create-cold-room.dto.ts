import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsUrl, IsUUID, Min } from 'class-validator';
import { PowerType, AssetStatus } from '@prisma/client';

export class CreateColdRoomDto {
  @ApiProperty({ example: 'Main Kigali Freezer' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'uuid-site-789' })
  @IsUUID()
  siteId: string;

  @ApiProperty({ example: 1000.0, description: 'Total capacity in KG' })
  @IsNumber()
  @Min(0)
  totalCapacityKg: number;

  @ApiProperty({ example: 2.5, description: 'Minimum operational temperature' })
  @IsNumber()
  temperatureMin: number;

  @ApiProperty({ example: 8.0 })
  @IsOptional()
  @IsNumber()
  temperatureMax?: number;

  @ApiProperty({ enum: PowerType, example: 'HYBRID' })
  @IsEnum(PowerType)
  powerType: PowerType;

  @ApiPropertyOptional({ enum: AssetStatus, example: AssetStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiPropertyOptional({ example: 'https://storage.com/room-image.jpg' })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}
