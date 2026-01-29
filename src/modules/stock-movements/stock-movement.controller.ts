import { Controller, Get, Post, Body, Query, Param, ParseUUIDPipe, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StockMovementsService } from './stock-movements.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';

@ApiTags('Stock Management')
@ApiBearerAuth()
@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly service: StockMovementsService) {}

  @Post()
  @ApiOperation({ summary: 'Record a new stock movement' })
  async record(@Body() dto: CreateStockMovementDto, @Request() req) {
    
    const userId = req.user.id; 
    return this.service.recordMovement(dto.productId, dto.quantityKg, dto.movementType, dto.reason, userId);
  }

  @Get()
  @ApiOperation({ summary: 'View movement history (Audit Trail)' })
  async getHistory(
    @Query('productId') productId?: string,
    @Query('siteId') siteId?: string,
  ) {
    return this.service.getHistory(productId, siteId);
  }

  @Post(':id/revert')
  @ApiOperation({ summary: 'Revert an erroneous stock entry' })
  async revert(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.service.revertMovement(id, req.user.id);
  }
}