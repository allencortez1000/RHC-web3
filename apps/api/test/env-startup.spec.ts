import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { loadEnv, loadLocalEnvFiles } from '@rhc/config';
import { bootstrap } from '../src/main';

jest.mock('@rhc/config', () => ({
  ...jest.requireActual('@rhc/config'),
  loadEnv: jest.fn(),
  loadLocalEnvFiles: jest.fn(),
}));
jest.mock('../src/modules/app.module', () => ({ AppModule: class StartupFixtureModule {} }));

describe('API environment bootstrap order', () => {
  const parse = jest.requireActual<typeof import('@rhc/config')>('@rhc/config').loadEnv;
  let create: jest.SpyInstance;
  let previousSwagger: string | undefined;
  beforeEach(() => {
    previousSwagger = process.env.ENABLE_SWAGGER;
    process.env.ENABLE_SWAGGER = 'false';
    create = jest.spyOn(NestFactory, 'create');
    jest.mocked(loadLocalEnvFiles).mockReset();
    jest.mocked(loadEnv).mockReset();
  });
  afterEach(() => {
    jest.restoreAllMocks();
    if (previousSwagger === undefined) delete process.env.ENABLE_SWAGGER;
    else process.env.ENABLE_SWAGGER = previousSwagger;
  });

  it('loads files, validates, configures trust/CORS, then listens without loading real providers', async () => {
    const order: string[] = [];
    const env = parse({ NODE_ENV: 'test', TRUSTED_PROXY_CIDRS: '192.0.2.0/24', CORS_ORIGINS: 'https://customer.example.test,https://admin.example.test' });
    const app = {
      set: jest.fn(() => order.push('proxy')),
      use: jest.fn(), enableCors: jest.fn(), setGlobalPrefix: jest.fn(),
      listen: jest.fn(async () => { order.push('listen'); }),
    };
    jest.mocked(loadLocalEnvFiles).mockImplementation(() => { order.push('files'); });
    jest.mocked(loadEnv).mockImplementation(() => { order.push('validate'); return env; });
    create.mockImplementation(async () => { order.push('create'); return app as unknown as NestExpressApplication; });
    await bootstrap();
    expect(order).toEqual(['files', 'validate', 'create', 'proxy', 'listen']);
    expect(app.set).toHaveBeenCalledWith('trust proxy', ['192.0.2.0/24']);
    expect(app.enableCors).toHaveBeenCalledWith({ origin: ['https://customer.example.test', 'https://admin.example.test'], credentials: true });
    expect(app.listen).toHaveBeenCalledWith(4000);
    expect(create).toHaveBeenCalledWith(expect.any(Function), { logger: false, abortOnError: false });
  });

  it('rejects bad environment input before creating providers or opening a listener', async () => {
    jest.mocked(loadEnv).mockImplementation(() => parse({ TRUSTED_PROXY_CIDRS: 'true' }));
    await expect(bootstrap()).rejects.toThrow('Invalid environment configuration: TRUSTED_PROXY_CIDRS');
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects file loading failure before validation or provider creation', async () => {
    jest.mocked(loadLocalEnvFiles).mockImplementation(() => { throw new Error('Unable to load optional environment file'); });
    await expect(bootstrap()).rejects.toThrow('Unable to load optional environment file');
    expect(loadEnv).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
