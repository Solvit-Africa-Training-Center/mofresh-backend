import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { InvoicesModule } from '../invoices/invoices.module';
import { MtnMomoService } from './services/mtn-momo.service';

@Module({
  imports: [InvoicesModule],
  providers: [PaymentsService, MtnMomoService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
