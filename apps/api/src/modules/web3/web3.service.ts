import { Injectable } from '@nestjs/common';
import type { ReadProvider } from '@rhc/web3';

@Injectable()
export class Web3Service {
  private provider?: Promise<ReadProvider>;

  private readProvider(): Promise<ReadProvider> {
    // Import and configure only after route authorization; never select demo/test
    // from request input or bypass the provider's approval/configuration checks.
    return this.provider ??= import('@rhc/web3').then(({ createReadProvider }) => createReadProvider(process.env, 'connected'));
  }

  async getTokenSnapshot() {
    return (await this.readProvider()).getTokenSnapshot();
  }

  async getReadStatus() {
    // This is configuration status, not a provider connectivity probe.
    return (await this.readProvider()).getReadStatus();
  }
}
