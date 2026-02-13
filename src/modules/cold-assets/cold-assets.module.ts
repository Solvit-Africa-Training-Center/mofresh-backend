import { Module } from '@nestjs/common';
import { ColdAssetsController } from './cold-assets.controller';
import { ColdAssetsService } from './cold-assets.services';
import { DatabaseModule } from '@/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ColdAssetsController],
  providers: [ColdAssetsService],
  exports: [ColdAssetsService],
})
export class ColdAssetsModule {}
