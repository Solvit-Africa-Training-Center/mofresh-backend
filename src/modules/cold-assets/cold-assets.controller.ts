import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ColdAssetsService } from './cold-assets.services';
import {
  CreateTricycleDto,
  CreateColdBoxDto,
  CreateColdPlateDto,
  UpdateAssetStatusDto,
} from './dto/cold-assets.dto';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Cold Assets (Logistics)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cold-assets')
export class ColdAssetsController {
  constructor(private readonly assetsService: ColdAssetsService) {}

  // 1. TRICYCLES

  @Post('tricycles')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Create a new tricycle' })
  createTricycle(@Body() dto: CreateTricycleDto, @CurrentUser() user: CurrentUserPayload) {
    return this.assetsService.createTricycle(dto, user);
  }

  @Get('tricycles')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Get tricycles (Admin sees all, Manager sees their site)' })
  getTricycles(@CurrentUser() user: CurrentUserPayload) {
    return this.assetsService.findTricycles(user);
  }

  // 2. COLD BOXES

  @Post('boxes')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Create a new cold box' })
  createBox(@Body() dto: CreateColdBoxDto, @CurrentUser() user: CurrentUserPayload) {
    return this.assetsService.createColdBox(dto, user);
  }

  @Get('boxes')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Get cold boxes (Filtered by user scope)' })
  getBoxes(@CurrentUser() user: CurrentUserPayload) {
    return this.assetsService.findColdBoxes(user);
  }

  // 3. COLD PLATES

  @Post('plates')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Create a new cold plate' })
  createPlate(@Body() dto: CreateColdPlateDto, @CurrentUser() user: CurrentUserPayload) {
    return this.assetsService.createColdPlate(dto, user);
  }

  @Get('plates')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Get cold plates (Filtered by user scope)' })
  getPlates(@CurrentUser() user: CurrentUserPayload) {
    return this.assetsService.findColdPlates(user);
  }

  // 4. STATUS & REMOVAL

  @Patch(':type/:id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Update status (Manager restricted to own site)' })
  updateStatus(
    @Param('type') type: 'tricycle' | 'coldBox' | 'coldPlate',
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.assetsService.updateStatus(type, id, dto.status, user);
  }

  @Delete(':type/:id')
  @Roles(UserRole.SUPER_ADMIN) // Usually, only Super Admins can delete assets
  @ApiOperation({ summary: 'Remove asset (Super Admin only)' })
  remove(
    @Param('type') type: 'tricycle' | 'coldBox' | 'coldPlate',
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.assetsService.remove(type, id, user);
  }
}
