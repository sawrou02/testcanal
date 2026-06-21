import {
  Body,
  Controller,
  Param,
  Delete,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { DepensesService } from './depenses.service';
import { CreateDepenseDto } from './dto/create-depense.dto';
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

@Controller('depenses')
export class DepensesController {
  constructor(private depensesService: DepensesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query('periode') periode?: string) {
    return this.depensesService.findAll(periode);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@Query('periode') periode?: string) {
    return this.depensesService.getStats(periode);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.COMPTABLE)
  async create(@Body() dto: CreateDepenseDto, @Req() req: Request) {
    const userId = (req.user as any).userId;
    return this.depensesService.create(dto, userId, getIp(req));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COMPTABLE)
  remove(@Param('id') id: string) {
    return this.depensesService.remove(id);
  }
}
