import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsUUID, IsOptional } from 'class-validator';
import { TricycleCategory, AssetStatus } from '@prisma/client';

export class CreateTricycleDto {
  @ApiProperty({ example: 'RAA 123 A' })
  @IsString()
  @IsNotEmpty()
  plateNumber: string;

  @ApiProperty({ example: 'uuid-site-789' })
  @IsUUID()
  siteId: string;

  @ApiProperty({ example: '200kg' })
  @IsString()
  capacity: string;

  @ApiProperty({ enum: TricycleCategory })
  @IsEnum(TricycleCategory)
  category: TricycleCategory;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Tricycle image file (will be uploaded to Cloudinary)',
  })
  @IsOptional()
  image?: Express.Multer.File;
}

export class CreateColdBoxDto {
  @ApiProperty({ example: 'CB-001' })
  @IsString()
  @IsNotEmpty()
  identificationNumber: string;

  @ApiProperty({ example: '50L' })
  @IsString()
  sizeOrCapacity: string;

  @ApiProperty({ example: 'uuid-site-789' })
  @IsUUID()
  siteId: string;

  @ApiProperty({ example: 'Zone B-4' })
  @IsString()
  location: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Cold box image file (will be uploaded to Cloudinary)',
  })
  @IsOptional()
  image?: Express.Multer.File;
}

export class CreateColdPlateDto {
  @ApiProperty({ example: 'CP-500' })
  @IsString()
  @IsNotEmpty()
  identificationNumber: string;

  @ApiProperty({ example: 'PCM-23' })
  @IsString()
  coolingSpecification: string;

  @ApiProperty({ example: 'uuid-site-789' })
  @IsUUID()
  siteId: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Cold plate image file (will be uploaded to Cloudinary)',
  })
  @IsOptional()
  image?: Express.Multer.File;
}

export class UpdateTricycleDto {
  @ApiProperty({ example: 'RAA 123 A', required: false })
  @IsString()
  @IsOptional()
  plateNumber?: string;

  @ApiProperty({ example: '200kg', required: false })
  @IsString()
  @IsOptional()
  capacity?: string;

  @ApiProperty({ enum: TricycleCategory, required: false })
  @IsEnum(TricycleCategory)
  @IsOptional()
  category?: TricycleCategory;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Tricycle image file (will be uploaded to Cloudinary)',
  })
  @IsOptional()
  image?: Express.Multer.File;
}

export class UpdateColdBoxDto {
  @ApiProperty({ example: 'CB-001', required: false })
  @IsString()
  @IsOptional()
  identificationNumber?: string;

  @ApiProperty({ example: '50L', required: false })
  @IsString()
  @IsOptional()
  sizeOrCapacity?: string;

  @ApiProperty({ example: 'Zone B-4', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Cold box image file (will be uploaded to Cloudinary)',
  })
  @IsOptional()
  image?: Express.Multer.File;
}

export class UpdateColdPlateDto {
  @ApiProperty({ example: 'CP-500', required: false })
  @IsString()
  @IsOptional()
  identificationNumber?: string;

  @ApiProperty({ example: 'PCM-23', required: false })
  @IsString()
  @IsOptional()
  coolingSpecification?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    required: false,
    description: 'Cold plate image file (will be uploaded to Cloudinary)',
  })
  @IsOptional()
  image?: Express.Multer.File;
}

export class UpdateAssetStatusDto {
  @ApiProperty({ enum: AssetStatus })
  @IsEnum(AssetStatus)
  status: AssetStatus;
}
