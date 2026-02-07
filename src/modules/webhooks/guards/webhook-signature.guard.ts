import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);
  private readonly webhookSecret: string;
  private readonly environment: string;

  constructor(private readonly configService: ConfigService) {
    this.webhookSecret = this.configService.get<string>('MOMO_WEBHOOK_SECRET') || '';
    this.environment = this.configService.get<string>('MOMO_ENVIRONMENT') || 'sandbox';
  }

  canActivate(context: ExecutionContext): boolean {
    if (this.environment === 'sandbox') {
      this.logger.log('Sandbox mode: Skipping webhook signature verification');
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { headers: Record<string, string>; body: Record<string, unknown> }>();
    const signature = request.headers['x-signature'] || request.headers['x-momo-signature'];
    const rawBody = JSON.stringify(request.body);

    if (!signature) {
      this.logger.warn('Webhook signature missing in request headers');
      throw new UnauthorizedException('Webhook signature missing');
    }

    if (!this.webhookSecret) {
      this.logger.warn('MOMO_WEBHOOK_SECRET not configured. Allowing webhook in development mode.');
      return true;
    }

    const isValid = this.verifySignature(rawBody, signature);

    if (!isValid) {
      this.logger.error('Invalid webhook signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    this.logger.log('Webhook signature verified successfully');
    return true;
  }

  private verifySignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    } catch (error) {
      this.logger.error('Error verifying webhook signature', error);
      return false;
    }
  }
}
