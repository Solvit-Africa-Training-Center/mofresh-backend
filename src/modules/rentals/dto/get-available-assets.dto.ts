import { ApiProperty } from '@nestjs/swagger';
import { AssetType } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class GetAvailableAssetsDto {
  @ApiProperty({
    description: 'Type of asset to fetch',
    enum: AssetType,
    example: AssetType.COLD_BOX,
  })
  @IsEnum(AssetType)
  @IsNotEmpty()
  assetType: AssetType;
}
