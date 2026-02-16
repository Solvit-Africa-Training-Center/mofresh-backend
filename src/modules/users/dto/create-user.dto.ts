/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsUUID,
  Matches,
  ValidateIf,
} from 'class-validator';
import { UserRole, ClientAccountType } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    example: 'SecurePass123!',
    description:
      'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character',
  })
  @IsString()
  @IsOptional()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password?: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+250788000000' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.CLIENT,
    description: 'User role: SUPER_ADMIN, SITE_MANAGER, SUPPLIER, or CLIENT',
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @ApiPropertyOptional({
    type: 'string',
    example: '3a8e310e-8a62-41a6-9b08-8b7f4e593840',
    description:
      'Required for SITE_MANAGER, SUPPLIER, and CLIENT roles. Should be null for SUPER_ADMIN.',
  })
  @ValidateIf((o) => o.role !== UserRole.SUPER_ADMIN)
  @IsNotEmpty({ message: 'siteId is required for SITE_MANAGER, SUPPLIER, and CLIENT roles' })
  @IsUUID(undefined, { message: 'siteId must be a valid UUID' })
  siteId?: string;

  @ApiPropertyOptional({
    enum: ClientAccountType,
    example: ClientAccountType.BUSINESS,
    description: 'Required if role is CLIENT',
  })
  @ValidateIf((o) => o.role === UserRole.CLIENT)
  @IsNotEmpty({ message: 'clientAccountType is required when role is CLIENT' })
  @IsEnum(ClientAccountType)
  clientAccountType?: ClientAccountType;

  @ApiPropertyOptional({ example: 'MoFresh Business Ltd' })
  @ValidateIf((o) => o.clientAccountType === ClientAccountType.BUSINESS)
  @IsNotEmpty({ message: 'businessName is required for BUSINESS accounts' })
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({ example: '123456789' })
  @ValidateIf((o) => o.clientAccountType === ClientAccountType.BUSINESS)
  @IsNotEmpty({ message: 'tinNumber is required for BUSINESS accounts' })
  @IsString()
  tinNumber?: string;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @IsOptional()
  businessCertificateDocument?: any;

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @IsOptional()
  nationalIdDocument?: any;
}
