import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3000),
        API_PREFIX: Joi.string().default('api/v1'),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRES_IN: Joi.string().default('1h'),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
        BCRYPT_ROUNDS: Joi.number().default(10),
        CORS_ORIGIN: Joi.string().default('http://localhost:3001'),
        PAYPACK_CLIENT_ID: Joi.string().optional(),
        PAYPACK_CLIENT_SECRET: Joi.string().optional(),
        PAYPACK_API_URL: Joi.string().optional(),
        PAYPACK_WEBHOOK_SECRET: Joi.string().optional(),
        THROTTLE_TTL: Joi.number().default(60),
        THROTTLE_LIMIT: Joi.number().default(100),
      }),
    }),
  ],
})
export class ConfigModule {}
