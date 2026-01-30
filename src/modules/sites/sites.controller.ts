import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SitesService } from './sites.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SiteEntity } from './dto/entities/site.entity';

@ApiTags('Sites')
@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new site' })
  @ApiResponse({
    status: 201,
    description: 'The site has been successfully created.',
    type: SiteEntity,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async create(
    @Body() createSiteDto: CreateSiteDto,
  ): Promise<{ status: string; message: string; data: SiteEntity }> {
    try {
      const createdSite = await this.sitesService.create(createSiteDto);
      return {
        status: 'success',
        message: 'Site created successfully',
        data: createdSite,
      };
    } catch (error) {
      throw new BadRequestException('Failed to create site', error.message);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all sites' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved all sites.',
    type: [SiteEntity],
  })
  async findAll(): Promise<{ status: string; message: string; data: SiteEntity[] }> {
    try {
      const sites = await this.sitesService.findAll();

      return {
        status: 'success',
        message: 'Successfully retrieved all sites.',
        data: sites,
      };
    } catch (error) {
      throw new BadRequestException('Failed to retrieve sites', error.message);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a site by ID' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved the site.', type: SiteEntity })
  @ApiResponse({ status: 404, description: 'Site not found.' })
  async findOne(
    @Param('id') id: string,
  ): Promise<{ status: string; message: string; data?: SiteEntity }> {
    const site = await this.sitesService.findOne(id);

    if (!site) {
      throw new NotFoundException(`Site with ID ${id} not found.`);
    }

    return {
      status: 'success',
      message: `Successfully retrieved site with ID ${id}`,
      data: site,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a site' })
  @ApiResponse({
    status: 200,
    description: 'The site has been successfully updated.',
    type: SiteEntity,
  })
  @ApiResponse({ status: 404, description: 'Site not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateSiteDto: UpdateSiteDto,
  ): Promise<{ status: string; message: string; data?: SiteEntity }> {
    const updatedSite = await this.sitesService.update(id, updateSiteDto);

    if (!updatedSite) {
      throw new NotFoundException(`Site with ID ${id} not found.`);
    }

    return {
      status: 'success',
      message: `Site with ID ${id} has been successfully updated.`,
      data: updatedSite,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a site' })
  @ApiResponse({ status: 200, description: 'The site has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Site not found.' })
  async remove(@Param('id') id: string): Promise<{ status: string; message: string }> {
    const site = await this.sitesService.remove(id);
    if (!site) {
      throw new NotFoundException(`Site with ID ${id} not found.`);
    }

    return {
      status: 'success',
      message: `Site with ID ${id} has been successfully deleted.`,
    };
  }
}
