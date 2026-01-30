import { Module } from '@nestjs/common';
import { SitesController } from './sites.controller';
import { SitesService } from './sites.service';
import { PrismaService } from '@/database/prisma.service';

@Module({
  imports: [],
  controllers: [SitesController],
  providers: [SitesService, PrismaService],
})
export class SitesModule {}
