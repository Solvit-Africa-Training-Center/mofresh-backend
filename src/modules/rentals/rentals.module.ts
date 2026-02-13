import { Module } from '@nestjs/common';
import { RentalsService } from './rentals.service';
import { RentalsController } from './rentals.controller';
import { DatabaseModule } from '../../database/database.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { ColdAssetsModule } from '../cold-assets/cold-assets.module';

@Module({
    imports: [DatabaseModule, InvoicesModule, ColdAssetsModule],
    controllers: [RentalsController],
    providers: [RentalsService],
    exports: [RentalsService],
})
export class RentalsModule { }
