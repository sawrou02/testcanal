import { Controller, Get, UseGuards } from '@nestjs/common';
import { SecurityService } from './security.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('security')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class SecurityController {
  constructor(private svc: SecurityService) {}

  @Get('events')
  events() {
    return this.svc.getEvents();
  }

  @Get('stats')
  stats() {
    return this.svc.getStats();
  }
}
