import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
// AIMEE: Uncomment when StockMovementsModule is ready
// import { StockMovementsModule } from '../stock-movements/stock-movements.module';
// STEVEN: Uncomment when InvoicesModule is ready
// import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [
    DatabaseModule,
    // AIMEE: Uncomment when ready
    // StockMovementsModule,
    // STEVEN: Uncomment when ready
    // InvoicesModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule { }
