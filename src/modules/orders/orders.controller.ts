import { Controller, Get, Post, Patch, Body, Param, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, RejectOrderDto } from './dto';
import { OrderStatus } from '@prisma/client';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new order' })
    @ApiResponse({ status: 201, description: 'Order created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input or insufficient stock' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async create(@Request() req: any, @Body() createOrderDto: CreateOrderDto) {
        const clientId = req.user?.id || 'temp-client-id';
        const siteId = req.user?.siteId || 'temp-site-id';

        return await this.ordersService.createOrders(clientId, siteId, createOrderDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all orders (site-scoped, optionally filter by status)' })
    @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
    @ApiQuery({
        name: 'status',
        enum: OrderStatus,
        required: false,
        description: 'Filter by order status',
    })
    async findAll(@Request() req: any, @Query('status') status?: OrderStatus) {
        const siteId = req.user?.siteId || 'temp-site-id';
        const clientId = req.user?.role === 'CLIENT' ? req.user?.id : undefined;

        return await this.ordersService.findAllOrders(siteId, clientId, status);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get order by ID' })
    @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async findOne(@Param('id') id: string, @Request() req: any) {
        const siteId = req.user?.siteId || 'temp-site-id';

        return await this.ordersService.findOne(id, siteId);
    }

    @Patch(':id/approve')
    @ApiOperation({ summary: 'Approve an order (SITE_MANAGER role)' })
    @ApiResponse({ status: 200, description: 'Order approved successfully' })
    @ApiResponse({ status: 400, description: 'Order cannot be approved' })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async approve(@Param('id') id: string, @Request() req: any) {
        const approverId = req.user?.id || 'temp-approver-id';
        const siteId = req.user?.siteId || 'temp-site-id';

        return await this.ordersService.approveOrders(id, approverId, siteId);
    }

    @Patch(':id/reject')
    @ApiOperation({ summary: 'Reject an order (SITE_MANAGER role)' })
    @ApiResponse({ status: 200, description: 'Order rejected successfully' })
    @ApiResponse({ status: 400, description: 'Order cannot be rejected' })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async reject(
        @Param('id') id: string,
        @Request() req: any,
        @Body() rejectOrderDto: RejectOrderDto,
    ) {
        const siteId = req.user?.siteId || 'temp-site-id';

        return await this.ordersService.rejectOrders(id, siteId, rejectOrderDto);
    }



    @Get('status/:status')
    @ApiOperation({ summary: 'Get orders by status' })
    @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
    async findByStatus(@Param('status') status: OrderStatus, @Request() req: any) {
        const siteId = req.user?.siteId || 'temp-site-id';

        return await this.ordersService.findByStatus(siteId, status);
    }
}
