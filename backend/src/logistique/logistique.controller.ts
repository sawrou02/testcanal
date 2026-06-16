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
import { LogistiqueService } from './logistique.service';
import { CreateMouvementDto } from './dto/create-mouvement.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

function getIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

@Controller()
export class LogistiqueController {
  constructor(private logistiqueService: LogistiqueService) {}

  @Get('logistique/stats')
  @UseGuards(JwtAuthGuard)
  async getStats() {
    return this.logistiqueService.getStats();
  }

  @Get('decodeurs/recherche')
  @UseGuards(JwtAuthGuard)
  async rechercheDecodeur(@Query('numSerie') numSerie?: string) {
    return this.logistiqueService.rechercheDecodeur(numSerie);
  }

  @Get('decodeurs')
  @UseGuards(JwtAuthGuard)
  async findDecodeurs(
    @Query('type') type?: string,
    @Query('statut') statut?: string,
    @Query('scope') scope?: string,
  ) {
    return this.logistiqueService.findDecodeurs(type, statut, scope);
  }

  @Get('logistique/immobilises')
  @UseGuards(JwtAuthGuard)
  async getImmobilises(@Query('type') type?: string) {
    return this.logistiqueService.getImmobilises(type);
  }

  @Get('logistique/inventaire')
  @UseGuards(JwtAuthGuard)
  async getInventaire(
    @Query('scope') scope?: string,
    @Query('type') type?: string,
  ) {
    return this.logistiqueService.getInventaire(scope, type);
  }

  @Get('mouvements')
  @UseGuards(JwtAuthGuard)
  async findMouvements() {
    return this.logistiqueService.findMouvements();
  }

  @Post('mouvements')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.LOGISTICIEN)
  async createMouvement(
    @Body() dto: CreateMouvementDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).userId;
    return this.logistiqueService.createMouvement(dto, userId, getIp(req));
  }
}
