import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { RentalsService } from './rentals.service';
import { CreateRentalDto } from './dto/create-rental.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Rentals')
@ApiBearerAuth()
@Controller('rentals')
export class RentalsController {
    constructor(private readonly rentalsService: RentalsService) { }

    @Post()
    @Roles(UserRole.CLIENT)
    @ApiOperation({ summary: 'Request a rental' })
    @ApiResponse({ status: 201, description: 'Rental requested successfully' })
    create(@Body() createRentalDto: CreateRentalDto, @CurrentUser() user: CurrentUserPayload) {
        return this.rentalsService.create(createRentalDto, user);
    }

    @Get()
    @Roles(UserRole.CLIENT, UserRole.SITE_MANAGER, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Get all rentals' })
    findAll(@CurrentUser() user: CurrentUserPayload) {
        return this.rentalsService.findAll(user);
    }

    @Get(':id')
    @Roles(UserRole.CLIENT, UserRole.SITE_MANAGER, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Get rental by ID' })
    findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
        return this.rentalsService.findOne(id, user);
    }

    @Patch(':id/approve')
    @Roles(UserRole.SITE_MANAGER, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Approve a rental request' })
    approve(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
        return this.rentalsService.approve(id, user);
    }

    @Patch(':id/complete')
    @Roles(UserRole.SITE_MANAGER, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Complete a rental' })
    complete(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
        return this.rentalsService.complete(id, user);
    }
}
