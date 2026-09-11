import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './modules/app.module';
import { ResponseEnvelopeInterceptor } from './platform/response-envelope.interceptor';
import { ApiExceptionFilter } from './platform/api-exception.filter';
import { RequestContextMiddleware } from './platform/request-context.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.use(helmet());
  app.enableCors({ origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3002').split(','), credentials: true });
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

  await app.listen(Number(process.env.PORT ?? 4000));
}

bootstrap();
