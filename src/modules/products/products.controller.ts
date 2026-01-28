import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiOkResponse, 
  ApiCreatedResponse, 
  ApiBearerAuth 
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ProductEntity } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto'; 
import { AdjustStockDto } from './dto/adjust-stock.dto';

@ApiTags('Products & Inventory')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new agricultural product' })
  @ApiCreatedResponse({ 
    type: ProductEntity, 
    description: 'Product created and initial stock movement recorded.' 
  })
  async create(@Body() createProductDto: CreateProductDto) {
    const userId = 'user-uuid-from-jwt'; 
    return this.productsService.create(createProductDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all products with site-specific filtering' })
  @ApiOkResponse({ type: [ProductEntity] })
  async findAll(@Query('siteId') siteId?: string) {
    return this.productsService.findAll(siteId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed product information' })
  @ApiOkResponse({ type: ProductEntity })
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product metadata (price, name, category)' })
  @ApiOkResponse({ type: ProductEntity })
  async update(
    @Param('id') id: string, 
    @Body() updateProductDto: UpdateProductDto
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @Patch(':id/adjust-stock')
  @ApiOperation({ summary: 'Record manual stock movement (Inflow/Outflow)' })
  @ApiOkResponse({ 
    type: ProductEntity, 
    description: 'Stock updated and cold room occupancy adjusted.' 
  })
  async adjustStock(
    @Param('id') id: string,
    @Body() adjustStockDto: AdjustStockDto
  ) {
    const userId = 'user-uuid-from-jwt';
    return this.productsService.adjustStock(id, adjustStockDto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a product' })
  @ApiOkResponse({ description: 'Product marked as deleted (records preserved for finance).' })
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}