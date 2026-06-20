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
import { VadService } from './vad.service';
import { LivraisonVadDto, VenteKitDto } from './dto/vad.dto';
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

const MUT = [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.LOGISTICIEN] as const;

@Controller('vad')
export class VadController {
  constructor(private svc: VadService) {}

  @Get('agents')
  @UseGuards(JwtAuthGuard)
  agents() {
    return this.svc.agents();
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  stats() {
    return this.svc.stats();
  }

  @Get('stock')
  @UseGuards(JwtAuthGuard)
  stock(@Query('vadId') vadId?: string) {
    return this.svc.stock(vadId);
  }

  @Get('ventes')
  @UseGuards(JwtAuthGuard)
  ventes() {
    return this.svc.ventes();
  }

  @Post('livraison')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  livraison(@Body() dto: LivraisonVadDto, @Req() req: Request) {
    return this.svc.livraison(dto, (req.user as any).userId, getIp(req));
  }

  @Post('vente-kit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  venteKit(@Body() dto: VenteKitDto, @Req() req: Request) {
    return this.svc.venteKit(dto, (req.user as any).userId, getIp(req));
  }
}
