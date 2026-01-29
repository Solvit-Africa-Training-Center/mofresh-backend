import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Query, 
  ParseUUIDPipe 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiOkResponse, 
  ApiCreatedResponse, 
  ApiBearerAuth 
} from '@nestjs/swagger';
import { ColdRoomService } from './cold-rooms.service';
import { ColdRoomEntity } from './entities/cold-room.entity';
import { CreateColdRoomDto } from './dto/create-cold-room.dto';
import { UpdateColdRoomDto } from './dto/update-cold-room.dto';
import { ColdRoomStatusDto } from './dto/cold-room-status.dto';

@ApiTags('ColdRooms (Infrastructure)')
@ApiBearerAuth()
@Controller('cold-rooms')
export class ColdRoomsController {
  constructor(private readonly coldRoomService: ColdRoomService) {}

  
  @Post()
  @ApiOperation({ summary: 'Register a new cold storage unit' })
  @ApiCreatedResponse({ type: ColdRoomEntity })
  async create(@Body() dto: CreateColdRoomDto): Promise<ColdRoomEntity> {
    return this.coldRoomService.create(dto);
  }

 
  @Get()
  @ApiOperation({ summary: 'List all cold rooms, optionally filtered by site' })
  @ApiOkResponse({ type: [ColdRoomEntity] })
  async findAll(@Query('siteId') siteId?: string): Promise<ColdRoomEntity[]> {
    return this.coldRoomService.findAll(siteId);
  }

  
  @Get(':id/occupancy')
  @ApiOperation({ summary: 'Calculate real-time occupancy and available space' })
  @ApiOkResponse({ type: ColdRoomStatusDto })
  async getOccupancy(
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<ColdRoomStatusDto> {
    return this.coldRoomService.getOccupancyDetails(id);
  }

 
  @Patch(':id')
  @ApiOperation({ summary: 'Update cold room configuration (Capacity, Temperature, Power)' })
  @ApiOkResponse({ type: ColdRoomEntity })
  async update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() dto: UpdateColdRoomDto
  ): Promise<ColdRoomEntity> {
    return this.coldRoomService.update(id, dto);
  }
}