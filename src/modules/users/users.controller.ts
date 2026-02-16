import {
  Controller,
  Get,
  Param,
  Patch,
  Delete,
  Body,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiOkResponse, ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UserEntity } from './entities/user.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Public for CLIENTs. Token required for SUPPLIER and SITE_MANAGER roles.',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'businessCertificateDocument', maxCount: 1 },
      { name: 'nationalIdDocument', maxCount: 1 },
    ]),
  )
  async register(
    @Body() dto: CreateUserDto,
    @UploadedFiles()
    files: {
      businessCertificateDocument?: Express.Multer.File[];
      nationalIdDocument?: Express.Multer.File[];
    },
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    const creatorId = user?.userId;

    return this.usersService.register(dto, creatorId, files);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOkResponse({
    type: [UserEntity],
    description: 'List of all active users',
  })
  @ApiOperation({ summary: 'Get all users' })
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.findAll(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOkResponse({
    type: UserEntity,
    description: 'User details retrieved successfully',
  })
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOkResponse({
    type: UserEntity,
    description: 'User updated successfully',
  })
  @ApiOperation({ summary: 'Update user details' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'businessCertificateDocument', maxCount: 1 },
      { name: 'nationalIdDocument', maxCount: 1 },
    ]),
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @UploadedFiles()
    files: {
      businessCertificateDocument?: Express.Multer.File[];
      nationalIdDocument?: Express.Multer.File[];
    },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.update(id, dto, user.userId, files);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOkResponse({ description: 'User soft deleted successfully' })
  @ApiOperation({
    summary: 'Soft delete user',
    description: 'Marks user as deleted (soft delete) and deactivates the account',
  })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.usersService.remove(id, user.userId);
  }
}
