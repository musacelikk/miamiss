import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: config.get('DB_SYNC') !== 'false',
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
  ],
})
export class AppModule {}
