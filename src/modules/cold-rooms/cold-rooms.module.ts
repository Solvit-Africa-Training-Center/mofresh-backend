import { Module } from '@nestjs/common';
import { ColdRoomsController } from './cold-rooms.controller';
import { ColdRoomService } from './cold-rooms.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [AuditLogsModule, CloudinaryModule],
  controllers: [ColdRoomsController],
  providers: [ColdRoomService],
  exports: [ColdRoomService],
})
export class ColdRoomsModule {}
