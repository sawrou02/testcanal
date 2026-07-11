import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { SmsService } from './sms.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AuditService } from '../audit/audit.service';

function clientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
}

@Controller('sms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class SmsController {
  constructor(
    private sms: SmsService,
    private audit: AuditService,
  ) {}

  @Get('config')
  getConfig() {
    return this.sms.getConfigPublic();
  }

  @Put('config')
  async saveConfig(@Body() dto: Record<string, unknown>, @Req() req: Request) {
    await this.audit.log((req.user as { userId: string }).userId, 'CONFIG_SMS', 'SMS', clientIp(req));
    await this.sms.saveConfig(dto);
    return this.sms.getConfigPublic();
  }

  @Post('test')
  async test(@Body() body: { numero: string }, @Req() req: Request) {
    await this.audit.log((req.user as { userId: string }).userId, 'TEST_SMS', 'SMS', clientIp(req));
    return this.sms.tester(body?.numero || '');
  }
}
