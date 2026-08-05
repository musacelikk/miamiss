import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities';
import { SettingsModule } from '../settings/settings.module';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User]), SettingsModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
