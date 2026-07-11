import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { RegionService } from './region.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('region')
export class RegionController {
  constructor(private region: RegionService) {}

  /** Public : l'app charge la devise/langue avant même la connexion. */
  @Get('config')
  getConfig() {
    return this.region.getConfig();
  }

  @Put('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  saveConfig(@Body() dto: Record<string, unknown>) {
    return this.region.saveConfig(dto);
  }
}
