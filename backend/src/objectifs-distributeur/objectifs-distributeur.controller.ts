import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Request } from 'express';
import { ObjectifsDistributeurService } from './objectifs-distributeur.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

class ObjDistDto {
  @IsInt() annee: number;
  @IsOptional() @IsInt() trimestre?: number;
  @IsOptional() @IsInt() mois?: number;
  @IsOptional() @IsString() formule?: string;
  @IsString() typeObjectif: string;
  @IsInt() @Min(0) effectif: number;
}

const MUT = [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER] as const;
const uid = (req: Request) => (req.user as any)?.userId ?? (req.user as any)?.id;

@Controller('objectifs-distributeur')
export class ObjectifsDistributeurController {
  constructor(private svc: ObjectifsDistributeurService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  findAll(@Query('annee') annee?: string, @Query('type') type?: string) {
    return this.svc.findAll(annee ? Number(annee) : undefined, type);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  create(@Body() dto: ObjDistDto, @Req() req: Request) {
    return this.svc.create(dto, uid(req));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  update(@Param('id') id: string, @Body() dto: Partial<ObjDistDto>) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
