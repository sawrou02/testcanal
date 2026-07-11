import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('analytics/ca-pdv')
  @UseGuards(JwtAuthGuard)
  async getCaPdv(@Query('periode') periode?: string) {
    return this.analyticsService.getCaPdv(periode);
  }

  @Get('analytics/rapport-graphique')
  @UseGuards(JwtAuthGuard)
  async getRapportGraphique(
    @Query('periode') periode?: string,
    @Query('debut') debut?: string,
    @Query('fin') fin?: string,
  ) {
    return this.analyticsService.getRapportGraphique(periode, debut, fin);
  }

  @Get('analytics/classement-pdv')
  @UseGuards(JwtAuthGuard)
  async getClassementPdv(@Query('periode') periode?: string) {
    return this.analyticsService.getClassementPdv(periode);
  }

  @Get('analytics/ca-formule')
  @UseGuards(JwtAuthGuard)
  async getCaFormule(@Query('periode') periode?: string) {
    return this.analyticsService.getCaFormule(periode);
  }

  @Get('analytics/recrutement-user')
  @UseGuards(JwtAuthGuard)
  async getRecrutementUser(@Query('periode') periode?: string) {
    return this.analyticsService.getRecrutementUser(periode);
  }

  @Get('analytics/arpu')
  @UseGuards(JwtAuthGuard)
  async getArpu(@Query('periode') periode?: string) {
    return this.analyticsService.getArpu(periode);
  }

  @Get('analytics/materiels-vendus')
  @UseGuards(JwtAuthGuard)
  async getMaterielsVendus() {
    return this.analyticsService.getMaterielsVendus();
  }

  @Get('analytics/reabo-momo')
  @UseGuards(JwtAuthGuard)
  async getReaboMomo() {
    return this.analyticsService.getReaboMomo();
  }

  @Get('analytics/bdd-globale')
  @UseGuards(JwtAuthGuard)
  async getBddGlobale() {
    return this.analyticsService.getBddGlobale();
  }

  @Get('audit-log')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async getAuditLog(@Query('limit') limit?: string) {
    const parsed = limit ? parseInt(limit, 10) : 200;
    const take = Number.isFinite(parsed) && parsed > 0 ? parsed : 200;
    return this.analyticsService.getAuditLog(take);
  }
}
