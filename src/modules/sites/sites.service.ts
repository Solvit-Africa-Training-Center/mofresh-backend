import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { SiteEntity } from './dto/entities/site.entity';

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}


  async create(createSiteDto: CreateSiteDto): Promise<SiteEntity> {
    return this.prisma.site.create({
      data: createSiteDto,
    });
  }

 
  async findAll(): Promise<SiteEntity[]> {
    return this.prisma.site.findMany();
  }


  async findOne(id: string): Promise<SiteEntity | null> {
    return this.prisma.site.findUnique({
      where: { id },
    });
  }


  async update(id: string, updateSiteDto: UpdateSiteDto): Promise<SiteEntity> {
    return this.prisma.site.update({
      where: { id },
      data: updateSiteDto,
    });
  }

  async remove(id: string): Promise<SiteEntity | null> {
    return this.prisma.site.delete({
      where: { id },
    });
  }
}
