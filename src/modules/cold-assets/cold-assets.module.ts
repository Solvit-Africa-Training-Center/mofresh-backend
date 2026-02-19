import { Module } from '@nestjs/common';
import { ColdAssetsController } from './cold-assets.controller';
import { ColdAssetsService } from './cold-assets.services';
import { DatabaseModule } from '@/database/database.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [DatabaseModule, AuditLogsModule, CloudinaryModule],
  controllers: [ColdAssetsController],
  providers: [ColdAssetsService],
  exports: [ColdAssetsService],
})
export class ColdAssetsModule {}
