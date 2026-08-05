import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Role } from '../entities';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard, type AuthUser } from '../auth/guards';
import { LogsService } from '../logs/logs.service';
import {
  SettingsService,
  type HomepageSettings,
  type NotificationSettings,
  type PuzzleSettings,
  type SeoSettings,
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

  @Get('settings/seo')
  getSeo() {
    return this.settings.getSeo();
  }

  @Get('admin/settings/puzzle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getPuzzle() {
    return this.settings.getPuzzle();
  }

  @Get('admin/settings/notifications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getNotifications() {
    return this.settings.getNotifications();
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

  @Put('admin/settings/puzzle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  updatePuzzle(@Body() patch: Partial<PuzzleSettings>, @CurrentUser() admin: AuthUser) {
    this.logs.record({
      userId: admin!.id,
      email: admin!.email,
      actorType: 'ADMIN',
      action: 'settings.puzzle',
      detail: 'Bulmaca ödül ayarları güncellendi',
    });
    return this.settings.updatePuzzle(patch);
  }

  @Put('admin/settings/notifications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  updateNotifications(
    @Body() patch: Partial<NotificationSettings>,
    @CurrentUser() admin: AuthUser,
  ) {
    this.logs.record({
      userId: admin!.id,
      email: admin!.email,
      actorType: 'ADMIN',
      action: 'settings.notifications',
      detail: 'Bildirim ayarları güncellendi',
    });
    return this.settings.updateNotifications(patch);
  }

  @Put('admin/settings/seo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  updateSeo(@Body() patch: Partial<SeoSettings>, @CurrentUser() admin: AuthUser) {
    this.logs.record({
      userId: admin!.id,
      email: admin!.email,
      actorType: 'ADMIN',
      action: 'settings.seo',
      detail: 'SEO ayarları güncellendi',
    });
    return this.settings.updateSeo(patch);
  }
}
