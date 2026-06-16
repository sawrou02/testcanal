import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { RetraitsService } from './retraits.service';
import { CreateRetraitDto } from './dto/create-retrait.dto';
import { RejeterDto } from './dto/rejeter.dto';
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

@Controller('retraits')
export class RetraitsController {
  constructor(private retraitsService: RetraitsService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats() {
    return this.retraitsService.getStats();
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query('statut') statut?: string) {
    return this.retraitsService.findAll(statut);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateRetraitDto) {
    return this.retraitsService.create(dto);
  }

  @Patch(':id/valider')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COMPTABLE)
  async valider(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.retraitsService.valider(id, userId, getIp(req));
  }

  @Patch(':id/rejeter')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COMPTABLE)
  async rejeter(
    @Param('id') id: string,
    @Body() dto: RejeterDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).userId;
    return this.retraitsService.rejeter(id, dto.motifRejet, userId, getIp(req));
  }
}
