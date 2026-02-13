import { ApiProperty } from '@nestjs/swagger';

export class UserEntity {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ example: '+250788000000' })
  phone: string;

  @ApiProperty({ example: 'ADMIN' })
  role: string;

  @ApiProperty({ example: 'uuid', nullable: true })
  siteId?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

<<<<<<< HEAD
  @ApiProperty({ enum: ['PERSONAL', 'BUSINESS'], nullable: true })
  clientAccountType?: string;

  @ApiProperty({ nullable: true })
  businessName?: string;

  @ApiProperty({ nullable: true })
  tinNumber?: string;

  @ApiProperty({ nullable: true })
  businessCertificateDocument?: string;

  @ApiProperty({ nullable: true })
  nationalIdDocument?: string;

=======
>>>>>>> 0725d90 (feat: implement product and stock management modules with RBAC, pessimistic locking, and comprehensive test coverage)
  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ nullable: true })
  deletedAt?: Date;
}
