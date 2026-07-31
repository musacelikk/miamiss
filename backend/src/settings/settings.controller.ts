import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Role } from '../entities';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard, type AuthUser } from '../auth/guards';
import { LogsService } from '../logs/logs.service';
import {
  SettingsService,
  type HomepageSettings,
  type StoreSettings,
} from './settings.service';

@Controller()
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly logs: LogsService,
  ) {}

  @Get('settings')
  get() {
    return this.settings.get();
  }

  @Get('settings/homepage')
  getHomepage() {
    return this.settings.getHomepage();
  }

  @Put('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(@Body() patch: Partial<StoreSettings>, @CurrentUser() admin: AuthUser) {
    this.logs.record({
      userId: admin!.id,
      email: admin!.email,
      actorType: 'ADMIN',
      action: 'settings.update',
      detail: 'Mağaza ayarları güncellendi',
    });
    return this.settings.update(patch);
  }

  @Put('admin/settings/homepage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  updateHomepage(@Body() patch: Partial<HomepageSettings>, @CurrentUser() admin: AuthUser) {
    this.logs.record({
      userId: admin!.id,
      email: admin!.email,
      actorType: 'ADMIN',
      action: 'settings.homepage',
      detail: 'Anasayfa içeriği güncellendi',
    });
    return this.settings.updateHomepage(patch);
  }
}
