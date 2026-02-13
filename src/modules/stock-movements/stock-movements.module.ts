import { Module } from '@nestjs/common';
import { StockMovementsController } from './stock-movement.controller';
import { StockMovementsService } from './stock-movements.service';

@Module({
  controllers: [StockMovementsController],
  providers: [StockMovementsService],
  exports: [StockMovementsService],
})
export class StockMovementsModule {}
