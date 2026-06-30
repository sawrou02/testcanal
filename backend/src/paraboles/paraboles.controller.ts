import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ParabolesService } from './paraboles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

class ParaboleDto {
  @IsString() pdvId: string;
  @IsInt() @Min(0) quantiteVendue: number;
  @IsOptional() @IsInt() @Min(0) quantiteStock?: number;
  @IsOptional() @IsString() technicien?: string;
}

const MUT = [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.LOGISTICIEN] as const;

@Controller('paraboles')
export class ParabolesController {
  constructor(private svc: ParabolesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.svc.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  create(@Body() dto: ParaboleDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  update(@Param('id') id: string, @Body() dto: Partial<ParaboleDto>) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
