import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';

const DEFAULT_JWT_SECRETS = [
  'sendistri-secret',
  'sendistri-secret-key',
  'your-super-secret-jwt-key-change-in-production',
];

function checkJwtSecret() {
  const secret = process.env.JWT_SECRET;
  const isInsecure = !secret || DEFAULT_JWT_SECRETS.includes(secret);

  if (process.env.NODE_ENV === 'production') {
    if (isInsecure) {
      throw new Error(
        'JWT_SECRET must be set to a secure, non-default value in production.',
      );
    }
  } else if (isInsecure) {
    // eslint-disable-next-line no-console
    console.warn(
      'WARNING: JWT_SECRET is missing or using a default value. Set a secure JWT_SECRET before deploying to production.',
    );
  }
}

async function bootstrap() {
  checkJwtSecret();

  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Corps volumineux acceptés (import de rapports CANAL en CSV).
  app.use(json({ limit: '30mb' }));
  app.use(urlencoded({ extended: true, limit: '30mb' }));

  app.use(helmet());

  app.enableCors({
    origin: process.env.WEB_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.setGlobalPrefix('api');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SENDISTRI API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`SENDISTRI API running on http://localhost:${port}`);
}
bootstrap();
