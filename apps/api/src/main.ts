import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { loadEnv, loadLocalEnvFiles, type RhcEnv } from '@rhc/config';

export function configureTrustedProxy(app: Pick<NestExpressApplication, 'set'>, env: Pick<RhcEnv, 'TRUSTED_PROXY_CIDRS'>) {
  app.set('trust proxy', env.TRUSTED_PROXY_CIDRS);
}

export async function bootstrap() {
  loadLocalEnvFiles();
  const env = loadEnv();
  // Load providers only after local files and validation, including import-time configuration.
  const { AppModule } = await import('./modules/app.module');
  // Nest's default startup exception logger can expose connection URLs and credentials.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false, abortOnError: false });
  configureTrustedProxy(app, env);
  app.use(helmet());
  const configuredOrigins = env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean);
  const localOrigins = env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:3002'] : [];
  const allowedOrigins = [...new Set([...configuredOrigins, ...localOrigins])];
  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.setGlobalPrefix('api/v1');


  if (process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('RHC Digital API')
      .setDescription('Month 1 RHC Digital foundation API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(env.PORT);
}

if (require.main === module) {
  const startupTimeout = setTimeout(() => {
    console.error('API startup timed out');
    process.exit(1);
  }, 30_000);
  void bootstrap().then(() => clearTimeout(startupTimeout)).catch(() => {
    console.error('API startup failed; check environment configuration and service availability');
    process.exit(1);
  });
}
