import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { DemoService } from './demo.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('demo')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class DemoController {
  constructor(private demo: DemoService) {}

  @Get('status')
  status() {
    return this.demo.status();
  }

  @Post('load')
  load() {
    return this.demo.load();
  }

  @Post('clear')
  clear() {
    return this.demo.clear();
  }
}
