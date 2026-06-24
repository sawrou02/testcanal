import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BaremesService } from './baremes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

class BaremeItemDto {
  @IsString() typeCommission: string;
  @IsNumber() valeur: number;
  @IsOptional() @IsString() unite?: string;
  @IsOptional() @IsBoolean() actif?: boolean;
}
class UpdateBaremesDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => BaremeItemDto)
  items: BaremeItemDto[];
}

@Controller('baremes')
export class BaremesController {
  constructor(private svc: BaremesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.svc.findAll();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  update(@Body() dto: UpdateBaremesDto) {
    return this.svc.updateMany(dto.items);
  }
}
