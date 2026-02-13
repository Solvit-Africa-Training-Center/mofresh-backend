import { Module } from '@nestjs/common';
import { ColdRoomsController } from './cold-rooms.controller';
import { ColdRoomService } from './cold-rooms.service';

@Module({
  controllers: [ColdRoomsController],
  providers: [ColdRoomService],
  exports: [ColdRoomService],
})
export class ColdRoomsModule {}
