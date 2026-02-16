/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  MinLength,
  ValidateIf,
  IsNotEmpty,
  IsUUID,
} from 'class-validator';
import { UserRole, ClientAccountType } from '@prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+250788000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.CLIENT })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: 'newSecurePassword123' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({
    type: 'string',
    example: '3a8e310e-8a62-41a6-9b08-8b7f4e593840',
    description:
      'Required for SITE_MANAGER, SUPPLIER, and CLIENT roles. Should be null for SUPER_ADMIN.',
  })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional({ enum: ClientAccountType, example: ClientAccountType.BUSINESS })
  @IsOptional()
  @IsEnum(ClientAccountType)
  clientAccountType?: ClientAccountType;

  @ApiPropertyOptional({ example: 'MoFresh Business Ltd' })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.clientAccountType === ClientAccountType.BUSINESS)
  @IsNotEmpty({ message: 'businessName is required for BUSINESS accounts' })
  businessName?: string;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.clientAccountType === ClientAccountType.BUSINESS)
  @IsNotEmpty({ message: 'tinNumber is required for BUSINESS accounts' })
  tinNumber?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @IsOptional()
  businessCertificateDocument?: any;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @IsOptional()
  nationalIdDocument?: any;
}
