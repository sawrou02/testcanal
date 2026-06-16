import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
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

  const app = await NestFactory.create(AppModule);

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

  const port = process.env.PORT || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`SENDISTRI API running on http://localhost:${port}`);
}
bootstrap();
