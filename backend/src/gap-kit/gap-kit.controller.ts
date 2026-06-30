import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { GapKitService } from './gap-kit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

class GapKitDto {
  @IsString() pdvId: string;
  @IsOptional() @IsString() clientNom?: string;
  @IsOptional() @IsString() numAbonne?: string;
  @IsString() kitVendu: string;
  @IsString() elementsManquants: string;
  @IsOptional() @IsString() statut?: string;
}

const MUT = [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.LOGISTICIEN] as const;

@Controller('gap-kit')
export class GapKitController {
  constructor(private svc: GapKitService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.svc.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  create(@Body() dto: GapKitDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  update(@Param('id') id: string, @Body() dto: Partial<GapKitDto>) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
