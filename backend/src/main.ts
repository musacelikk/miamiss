import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Guvenlik basliklari. API + S3/CloudFront gorselleri servis edildigi icin
  // CSP ve COEP kapali; digerleri (HSTS, nosniff, referrer vb.) aktif.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  // Railway/CloudFront arkasinda gercek istemci IP'sini almak icin
  app.set('trust proxy', 1);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const corsOrigins = [
    process.env.FRONTEND_URL ?? 'http://localhost:3000',
    process.env.ADMIN_URL ?? 'https://admin.miamisuhome.com',
    'https://miamisuhome.com',
    'https://www.miamisuhome.com',
    'http://localhost:3000',
    'http://admin.localhost:3000',
  ];
  app.enableCors({
    origin: [...new Set(corsOrigins)],
    credentials: true,
  });
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  await app.listen(process.env.PORT ?? 4000);
  console.log(`miamiss backend -> http://localhost:${process.env.PORT ?? 4000}/api`);
}
void bootstrap();
