import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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
