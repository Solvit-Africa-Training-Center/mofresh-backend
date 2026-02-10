import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto';
import { RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { CurrentUser } from '../../common/decorators';
import { AuthenticatedUser } from '../../common/interfaces';
import { UserRole, PaymentStatus } from '@prisma/client';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('momo/initiate')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.CLIENT, UserRole.SITE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Initiate MTN MoMo payment' })
  @ApiResponse({ status: 201, description: 'Payment initiated successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async initiatePayment(@Body() body: InitiatePaymentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.paymentsService.initiatePayment(
      body.invoiceId,
      body.phoneNumber,
      user.id,
      user.role,
      user.siteId,
    );
  }

  @Post(':id/mark-paid')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SITE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Manually mark payment as paid' })
  @ApiResponse({ status: 200, description: 'Payment marked as paid' })
  async markPaidManually(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const userSiteId = user.role === UserRole.SUPER_ADMIN ? undefined : user.siteId;
    return this.paymentsService.markPaidManually(id, user.id, userSiteId);
  }

  @Get(':id')
  @Roles(UserRole.SITE_MANAGER, UserRole.SUPER_ADMIN, UserRole.CLIENT)
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.paymentsService.findOne(id, user.id, user.role, user.siteId);
  }

  @Get()
  @Roles(UserRole.SITE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all payments' })
  @ApiResponse({ status: 200, description: 'Payments list' })
  async findAll(@Query('invoiceId') invoiceId?: string, @Query('status') status?: PaymentStatus) {
    return this.paymentsService.findAll({ invoiceId, status });
  }
}
