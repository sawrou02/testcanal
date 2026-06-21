import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PdvsService } from './pdvs.service';
import { CreatePdvDto } from './dto/create-pdv.dto';
import { UpdatePdvDto } from './dto/update-pdv.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('pdvs')
export class PdvsController {
  constructor(private pdvsService: PdvsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query('type') type?: string, @Query('statut') statut?: string) {
    return this.pdvsService.findAll(type, statut);
  }

  @Get('soldes')
  @UseGuards(JwtAuthGuard)
  async getSoldes() {
    return this.pdvsService.getSoldes();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.pdvsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  async create(@Body() dto: CreatePdvDto) {
    return this.pdvsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  async update(@Param('id') id: string, @Body() dto: UpdatePdvDto) {
    return this.pdvsService.update(id, dto);
  }

  @Post(':id/caution')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.COMPTABLE)
  async augmenterCaution(@Param('id') id: string, @Body() body: { montant: number }) {
    return this.pdvsService.augmenterCaution(id, Number(body.montant) || 0);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  remove(@Param('id') id: string) {
    return this.pdvsService.remove(id);
  }
}
