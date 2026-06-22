import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CreateRetourRpeDto, RetourRpeService, UpdateRetourRpeDto } from './retour-rpe.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

const MUT = [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.COMMERCIAL] as const;

@Controller('retour-rpe')
export class RetourRpeController {
  constructor(private svc: RetourRpeService) {}
  @Get() @UseGuards(JwtAuthGuard) findAll() { return this.svc.findAll(); }
  @Post() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...MUT) create(@Body() dto: CreateRetourRpeDto) { return this.svc.create(dto); }
  @Patch(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(...MUT) update(@Param('id') id: string, @Body() dto: UpdateRetourRpeDto) { return this.svc.update(id, dto); }
  @Delete(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER) remove(@Param('id') id: string) { return this.svc.remove(id); }
}
