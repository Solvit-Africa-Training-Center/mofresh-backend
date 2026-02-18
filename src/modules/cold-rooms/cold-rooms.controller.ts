import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ColdRoomService } from './cold-rooms.service';
import { ColdRoomEntity } from './entities/cold-room.entity';
import { CreateColdRoomDto } from './dto/create-cold-room.dto';
import { UpdateColdRoomDto } from './dto/update-cold-room.dto';
import { ColdRoomStatusDto } from './dto/cold-room-status.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('ColdRooms (Infrastructure)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cold-rooms')
export class ColdRoomsController {
  constructor(private readonly coldRoomService: ColdRoomService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Register a new cold storage unit' })
  @ApiCreatedResponse({ type: ColdRoomEntity })
  async create(@Body() dto: CreateColdRoomDto, @CurrentUser() user: CurrentUserPayload) {
    return this.coldRoomService.create(dto, user);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'List cold rooms (filtered by site for managers)' })
  @ApiOkResponse({ type: [ColdRoomEntity] })
  async findAll(@CurrentUser() user: CurrentUserPayload, @Query('siteId') siteId?: string) {
    return this.coldRoomService.findAll(user, siteId);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Get details for a specific cold room' })
  @ApiOkResponse({ type: ColdRoomEntity })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.coldRoomService.findOne(id, user);
  }

  @Get(':id/occupancy')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Get real-time space availability' })
  @ApiOkResponse({ type: ColdRoomStatusDto })
  async getOccupancy(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.coldRoomService.getOccupancyDetails(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Update capacity or temperature' })
  @ApiOkResponse({ type: ColdRoomEntity })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateColdRoomDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.coldRoomService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SITE_MANAGER)
  @ApiOperation({ summary: 'Archive/Soft-delete a cold room' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.coldRoomService.remove('coldRoom', id, user);
  }
}
