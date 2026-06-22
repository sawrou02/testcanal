import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ServiceAbonnementService } from './service-abonnement.service';
import { SendSmsDto } from './dto/send-sms.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

function getIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

@Controller('service-abonnement')
@UseGuards(JwtAuthGuard)
export class ServiceAbonnementController {
  constructor(private service: ServiceAbonnementService) {}

  @Get('stats')
  async getStats() {
    return this.service.getStats();
  }

  @Get('aae')
  async getAae(@Query('jours') jours?: string) {
    const parsed = jours !== undefined ? parseInt(jours, 10) : NaN;
    const j = Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
    return this.service.getAae(j);
  }

  @Get('echus')
  async getEchus() {
    return this.service.getEchus();
  }

  @Get('non-qualifies')
  async getNonQualifies() {
    return this.service.getNonQualifies();
  }

  @Get('suivi-mp')
  async getSuiviMp(
    @Query('mois') mois?: string,
    @Query('annee') annee?: string,
    @Query('type') type?: string,
    @Query('pdvId') pdvId?: string,
  ) {
    return this.service.getSuiviMp(
      mois ? parseInt(mois, 10) : undefined,
      annee ? parseInt(annee, 10) : undefined,
      type || 'M+1',
      pdvId || undefined,
    );
  }

  @Get('bienvenue')
  async getBienvenue() {
    return this.service.getBienvenue();
  }

  @Get('recrutement')
  async getRecrutement() {
    return this.service.getRecrutement();
  }

  @Post('sms')
  async sendSms(@Body() dto: SendSmsDto, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.service.sendSms(dto, userId, getIp(req));
  }
}
