import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { isMockDataEnabled } from './mock-data';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  get mockMode(): boolean {
    return isMockDataEnabled();
  }

  async onModuleInit() {
    if (this.mockMode) {
      this.logger.warn('Running API with mock data. No database connection will be opened.');
      return;
    }
    await this.$connect();
  }

  async onModuleDestroy() {
    if (this.mockMode) return;
    await this.$disconnect();
  }
}
