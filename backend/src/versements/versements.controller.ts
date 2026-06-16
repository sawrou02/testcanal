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
import { VersementsService } from './versements.service';
import { CreateVersementDto } from './dto/create-versement.dto';
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

@Controller('versements')
export class VersementsController {
  constructor(private versementsService: VersementsService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats() {
    return this.versementsService.getStats();
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query('statut') statut?: string) {
    return this.versementsService.findAll(statut);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateVersementDto) {
    return this.versementsService.create(dto);
  }

  @Patch(':id/valider')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COMPTABLE)
  async valider(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.versementsService.valider(id, userId, getIp(req));
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
    return this.versementsService.rejeter(
      id,
      dto.motifRejet,
      userId,
      getIp(req),
    );
  }
}
