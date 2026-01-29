import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

// ============================================================================
// DEPENDENCIES - Uncomment when Aimee and Steven complete their modules
// ============================================================================
// import { StockMovementsModule } from '../stock-movements/stock-movements.module';
// import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [
    DatabaseModule,
    // ========================================================================
    // TODO: Uncomment after Aimee creates StockMovementsService.reserveStockForOrder()
    // ========================================================================
    // StockMovementsModule,

    // ========================================================================
    // TODO: Uncomment after Steven creates InvoicesService.generateOrderInvoice()
    // ========================================================================
    // InvoicesModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
