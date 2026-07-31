import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '../entities';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { LogsService } from './logs.service';

@Controller('admin/logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class LogsController {
  constructor(private readonly logs: LogsService) {}

  @Get()
  list(
    @Query('actorType') actorType?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
  ) {
    return this.logs.findAdmin({
      actorType: actorType || undefined,
      search: search || undefined,
      page: page ? parseInt(page, 10) : 1,
    });
  }
}
