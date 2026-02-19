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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ColdAssetsService } from './cold-assets.services';
import {
  CreateTricycleDto,
  CreateColdBoxDto,
  CreateColdPlateDto,
  UpdateTricycleDto,
  UpdateColdBoxDto,
  UpdateColdPlateDto,
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
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  createTricycle(
    @Body() dto: CreateTricycleDto,
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.assetsService.createTricycle(dto, user, image);
  }

  @Get('tricycles')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Get tricycles (Admin sees all, Manager sees their site)' })
  getTricycles(@CurrentUser() user: CurrentUserPayload) {
    return this.assetsService.findTricycles(user);
  }

  @Patch('tricycles/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Update tricycle details' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  updateTricycle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTricycleDto,
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.assetsService.updateTricycle(id, dto, user, image);
  }

  // 2. COLD BOXES

  @Post('boxes')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Create a new cold box' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  createBox(
    @Body() dto: CreateColdBoxDto,
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.assetsService.createColdBox(dto, user, image);
  }

  @Get('boxes')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Get cold boxes (Filtered by user scope)' })
  getBoxes(@CurrentUser() user: CurrentUserPayload) {
    return this.assetsService.findColdBoxes(user);
  }

  @Patch('boxes/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Update cold box details' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  updateBox(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateColdBoxDto,
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.assetsService.updateColdBox(id, dto, user, image);
  }

  // 3. COLD PLATES

  @Post('plates')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Create a new cold plate' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  createPlate(
    @Body() dto: CreateColdPlateDto,
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.assetsService.createColdPlate(dto, user, image);
  }

  @Get('plates')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Get cold plates (Filtered by user scope)' })
  getPlates(@CurrentUser() user: CurrentUserPayload) {
    return this.assetsService.findColdPlates(user);
  }

  @Patch('plates/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Update cold plate details' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  updatePlate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateColdPlateDto,
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.assetsService.updateColdPlate(id, dto, user, image);
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
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Remove asset (Manager restricted to own site, Admin unrestricted)' })
  remove(
    @Param('type') type: 'tricycle' | 'coldBox' | 'coldPlate',
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.assetsService.remove(type, id, user);
  }
}
