import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AccessoiresService } from './accessoires.service';
import {
  ApproDto,
  CreateAccessoireDto,
  LivraisonDto,
  RetourDto,
  UpdateAccessoireDto,
  VenteDto,
} from './dto/accessoire.dto';
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

@Controller('accessoires')
export class AccessoiresController {
  constructor(private svc: AccessoiresService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.svc.findAll();
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  stats() {
    return this.svc.getStats();
  }

  @Get('stock-reseau')
  @UseGuards(JwtAuthGuard)
  stockReseau() {
    return this.svc.stockReseau();
  }

  @Get('ventes')
  @UseGuards(JwtAuthGuard)
  ventes() {
    return this.svc.ventes();
  }

  @Get('retours')
  @UseGuards(JwtAuthGuard)
  retours() {
    return this.svc.retours();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  create(@Body() dto: CreateAccessoireDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  update(@Param('id') id: string, @Body() dto: UpdateAccessoireDto) {
    return this.svc.update(id, dto);
  }

  @Post('approvisionnement')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  appro(@Body() dto: ApproDto, @Req() req: Request) {
    return this.svc.approvisionner(dto, (req.user as any).userId, getIp(req));
  }

  @Post('livraison')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  livrer(@Body() dto: LivraisonDto, @Req() req: Request) {
    return this.svc.livrer(dto, (req.user as any).userId, getIp(req));
  }

  @Post('ventes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  vendre(@Body() dto: VenteDto, @Req() req: Request) {
    return this.svc.vendre(dto, (req.user as any).userId, getIp(req));
  }

  @Post('retours')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  retour(@Body() dto: RetourDto, @Req() req: Request) {
    return this.svc.creerRetour(dto, (req.user as any).userId, getIp(req));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.LOGISTICIEN)
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
