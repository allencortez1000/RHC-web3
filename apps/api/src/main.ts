import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './modules/app.module';
import { ResponseEnvelopeInterceptor } from './platform/response-envelope.interceptor';
import { ApiExceptionFilter } from './platform/api-exception.filter';
import { RequestContextMiddleware } from './platform/request-context.middleware';
import { loadEnv } from '@rhc/config';

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.use(helmet());
  const configuredOrigins = env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean);
  const localOrigins = env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:3002'] : [];
  const allowedOrigins = [...new Set([...configuredOrigins, ...localOrigins])];
  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.setGlobalPrefix('api/v1');
  app.use(new RequestContextMiddleware().use);
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());

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

bootstrap();
