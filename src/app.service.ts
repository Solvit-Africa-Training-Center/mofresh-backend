import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): object {
    return {
      status: 'success',
      message: 'MoFresh API is running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}
