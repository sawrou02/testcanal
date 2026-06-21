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
import {
  CreateInstallationDto,
  InstallationsService,
  UpdateInstallationDto,
} from './installations.service';
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

@Controller('installations')
export class InstallationsController {
  constructor(private svc: InstallationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.svc.findAll();
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  stats() {
    return this.svc.stats();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  create(@Body() dto: CreateInstallationDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  update(@Param('id') id: string, @Body() dto: UpdateInstallationDto, @Req() req: Request) {
    return this.svc.update(id, dto, (req.user as any).userId, getIp(req));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.LOGISTICIEN)
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
