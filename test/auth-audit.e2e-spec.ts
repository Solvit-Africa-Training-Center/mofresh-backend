/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
jest.setTimeout(60000);

import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { AuditAction } from '@prisma/client';

describe('Auth & Audit Logs (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let clientAccessToken: string;
  let clientUserId: string;
  let adminAccessToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    jest.setTimeout(60000);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('Login & Audit Logs', () => {
    it('should login as client (no OTP) and create an audit log', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'client1@example.rw',
          password: 'Password123!',
        })
        .expect(201);

      expect(loginResponse.body).toHaveProperty('accessToken');
      clientAccessToken = loginResponse.body.accessToken;
      clientUserId = loginResponse.body.user.id;

      // Check audit log
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          userId: clientUserId,
          action: AuditAction.UPDATE,
        },
      });

      expect(auditLog).toBeDefined();
      expect((auditLog?.details as any).action).toBe('LOGIN');
      expect(auditLog?.entityType).toBe('USER');
    });

    it('should login as admin and create an audit log', async () => {
      const loginResponse = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
        email: 'admin@mofresh.rw',
        password: 'Password123!',
      });

      console.log('Admin login response:', loginResponse.body);
      expect(loginResponse.status).toBe(201);

      if (loginResponse.body.status === 'otp_sent') {
        let otp = null;
        for (let i = 0; i < 5; i++) {
          otp = await prisma.otp.findFirst({
            where: { email: 'admin@mofresh.rw' },
            orderBy: { createdAt: 'desc' },
          });
          if (otp) break;
          await new Promise((r) => setTimeout(r, 500));
        }

        console.log('Found OTP:', otp?.code);

        const verifyResponse = await request(app.getHttpServer())
          .post('/api/v1/auth/verify-otp')
          .send({
            email: 'admin@mofresh.rw',
            code: otp?.code,
          });

        console.log('Verify response body:', verifyResponse.body);
        adminAccessToken = verifyResponse.body.accessToken;
        adminUserId = verifyResponse.body.user?.id;
      } else {
        adminAccessToken = loginResponse.body.accessToken;
        adminUserId = loginResponse.body.user.id;
      }

      expect(adminAccessToken).toBeDefined();

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          userId: adminUserId,
          action: AuditAction.UPDATE,
        },
      });

      expect(auditLog).toBeDefined();
      expect((auditLog?.details as any).action).toBe('LOGIN');
    });
  });

  describe('Sites & Audit Logs', () => {
    let siteId: string;

    it('should create a site and log the action', async () => {
      const siteResponse = await request(app.getHttpServer())
        .post('/api/v1/sites')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          name: 'Test Site ' + Date.now(),
          location: 'Test Location',
        })
        .expect(201);

      siteId = siteResponse.body.data.id;

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          entityId: siteId,
          action: AuditAction.CREATE,
          entityType: 'SITE',
          userId: adminUserId,
        },
      });

      expect(auditLog).toBeDefined();
    });
  });

  describe('Logout & Audit Logs', () => {
    it('should logout client and log the action', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${clientAccessToken}`);

      if (response.status !== 201) {
        console.log('Logout failed:', response.body);
      }
      expect(response.status).toBe(201);

      // Check audit log
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          userId: clientUserId,
          action: AuditAction.UPDATE,
        },
        orderBy: { timestamp: 'desc' },
      });

      expect(auditLog).toBeDefined();

      expect((auditLog?.details as any).action).toBe('LOGOUT');

      const user = await prisma.user.findUnique({
        where: { id: clientUserId },
      });
      expect(user?.refreshToken).toBeNull();
    });

    it('should logout admin and log the action', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(201);

      // Check audit log
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          userId: adminUserId,
          action: AuditAction.UPDATE,
        },
        orderBy: { timestamp: 'desc' },
      });

      expect(auditLog).toBeDefined();

      expect((auditLog?.details as any).action).toBe('LOGOUT');
    });
  });
});
