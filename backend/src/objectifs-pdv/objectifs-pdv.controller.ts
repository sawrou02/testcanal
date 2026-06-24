import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Request } from 'express';
import { ObjectifsPdvService } from './objectifs-pdv.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

class ObjPdvDto {
  @IsString() pdvId: string;
  @IsInt() annee: number;
  @IsInt() mois: number;
  @IsString() typeObjectif: string;
  @IsInt() @Min(0) effectif: number;
}
class ImportDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ObjPdvDto)
  items: ObjPdvDto[];
}

const MUT = [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER] as const;
const uid = (req: Request) => (req.user as any)?.userId ?? (req.user as any)?.id;

@Controller('objectifs-pdv')
export class ObjectifsPdvController {
  constructor(private svc: ObjectifsPdvService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query('annee') annee?: string, @Query('mois') mois?: string) {
    return this.svc.findAll(annee ? Number(annee) : undefined, mois ? Number(mois) : undefined);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  create(@Body() dto: ObjPdvDto, @Req() req: Request) {
    return this.svc.create(dto, uid(req));
  }

  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  importMany(@Body() dto: ImportDto, @Req() req: Request) {
    return this.svc.importMany(dto.items, uid(req));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  update(@Param('id') id: string, @Body() dto: Partial<ObjPdvDto>) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
