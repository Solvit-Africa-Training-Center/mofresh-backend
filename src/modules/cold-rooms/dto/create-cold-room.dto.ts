import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
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
  @Type(() => Number)
  totalCapacityKg: number;

  @ApiProperty({ example: 2.5, description: 'Minimum operational temperature' })
  @IsNumber()
  @Type(() => Number)
  temperatureMin: number;

  @ApiProperty({ example: 8.0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  temperatureMax?: number;

  @ApiProperty({ enum: PowerType, example: 'HYBRID' })
  @IsEnum(PowerType)
  powerType: PowerType;

  @ApiPropertyOptional({ enum: AssetStatus, example: AssetStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Cold room image file',
  })
  @IsOptional()
  image?: any;
}
