import {
  Controller,
  Get,
  Query,
  Logger,
  //UseGuards
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  //ApiBearerAuth
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import {
  RevenueReportQueryDto,
  RevenueReportResponseDto,
  AggregatedRevenueReportDto,
  UnpaidInvoicesQueryDto,
  UnpaidInvoicesReportDto,
} from './dto';
// import { RolesGuard } from '../../common/guards';
// import { Roles, CurrentUser } from '../../common/decorators';
// import { AuthenticatedUser } from '../../common/interfaces';
// import { UserRole } from '@prisma/client';

@ApiTags('Reports')
@Controller('reports')
// @UseGuards(RolesGuard)
// @ApiBearerAuth()
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(private readonly reportsService: ReportsService) {}

  @Get('revenue')
  // @Roles(UserRole.SITE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get revenue report',
    description:
      'Generate revenue report aggregating product sales and rental income. ' +
      'Site Managers see only their site. Super Admin can see all sites or filter by site.',
  })
  @ApiResponse({
    status: 200,
    description: 'Revenue report generated successfully',
    type: RevenueReportResponseDto,
  })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'siteId', required: false, type: String })
  async getRevenueReport(
    @Query() query: RevenueReportQueryDto,
    // @CurrentUser() user?: AuthenticatedUser,
  ): Promise<RevenueReportResponseDto | AggregatedRevenueReportDto> {
    this.logger.log('Revenue report requested', { query });

    // const userSiteId = user?.role === UserRole.SUPER_ADMIN ? undefined : user?.siteId;
    const userSiteId: string | undefined = undefined;

    return this.reportsService.getRevenueReport(query, userSiteId);
  }

  @Get('unpaid-invoices')
  // @Roles(UserRole.SITE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get unpaid invoices report',
    description:
      'List all unpaid invoices with balance due and days overdue. ' +
      'Supports pagination and filtering by site and overdue status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Unpaid invoices report generated successfully',
    type: UnpaidInvoicesReportDto,
  })
  @ApiQuery({ name: 'siteId', required: false, type: String })
  @ApiQuery({ name: 'overdue', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUnpaidInvoicesReport(
    @Query() query: UnpaidInvoicesQueryDto,
    // @CurrentUser() user?: AuthenticatedUser,
  ): Promise<UnpaidInvoicesReportDto> {
    this.logger.log('Unpaid invoices report requested', { query });

    // const userSiteId = user?.role === UserRole.SUPER_ADMIN ? undefined : user?.siteId;
    const userSiteId: string | undefined = undefined;

    return this.reportsService.getUnpaidInvoicesReport(query, userSiteId);
  }
}
