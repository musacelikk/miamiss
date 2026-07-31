import { Module } from '@nestjs/common';
import { join } from 'path';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { UploadsModule } from './uploads/uploads.module';
import { OrdersModule } from './orders/orders.module';
import { CouponsModule } from './coupons/coupons.module';
import { GiftCardsModule } from './gift-cards/gift-cards.module';
import { PuzzleModule } from './puzzle/puzzle.module';
import { SettingsModule } from './settings/settings.module';
import { ContactModule } from './contact/contact.module';
import { AdminModule } from './admin/admin.module';
import { MailModule } from './mail/mail.module';
import { LogsModule } from './logs/logs.module';
import { BlogModule } from './blog/blog.module';
import { SupportModule } from './support/support.module';
import { MarketingModule } from './marketing/marketing.module';
import { ReturnsModule } from './returns/returns.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Kaba kuvvet ve spam korumasi: dakikada 120 istek (IP basina)
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        // Gelistirmede sema otomatik esitlenir; uretimde DB_SYNC=false yapip
        // "npm run migration:generate" ile uretilen migration'lar acilista kosulur.
        synchronize: config.get('DB_SYNC') !== 'false',
        migrations: [join(__dirname, 'migrations', '*.js')],
        migrationsRun: config.get('DB_SYNC') === 'false',
        ssl: config.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : undefined,
      }),
    }),
    MailModule,
    LogsModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    UploadsModule,
    OrdersModule,
    CouponsModule,
    GiftCardsModule,
    PuzzleModule,
    SettingsModule,
    ContactModule,
    AdminModule,
    BlogModule,
    SupportModule,
    MarketingModule,
    ReturnsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
