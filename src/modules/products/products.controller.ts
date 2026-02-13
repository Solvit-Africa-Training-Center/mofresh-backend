import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Register a new agricultural product' })
  async create(@Body() dto: CreateProductDto, @CurrentUser() user: CurrentUserPayload) {
    return this.productsService.create(dto, user);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'List all products with site-specific filtering' })
  async findAll(@CurrentUser() user: CurrentUserPayload, @Query('siteId') siteId?: string) {
    return this.productsService.findAll(user, siteId);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Get detailed product information' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.productsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Update product metadata' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.productsService.update(id, dto, user);
  }

  @Patch(':id/adjust-stock')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  async adjustStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.productsService.adjustStock(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Soft delete a product' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.productsService.remove(id, user);
  }
}
