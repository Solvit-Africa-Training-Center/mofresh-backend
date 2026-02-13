import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { ResetEmailService } from './Resetmail.service';

@Module({
  providers: [MailService, ResetEmailService],
  exports: [MailService],
})
export class MailModule {}
