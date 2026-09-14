import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Kept for the auth/identity service interface. Runtime authorization never uses
  // fixture data; tests must explicitly replace the database provider instead.
  get mockMode(): boolean { return false; }

  async onModuleInit() {
    if (process.env.USE_MOCK_DATA === 'true') throw new Error('API mock mode is not supported; configure a database');
    await this.$connect();
  }
  async onModuleDestroy() { await this.$disconnect(); }
}
