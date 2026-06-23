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
import { AbonnesService } from './abonnes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateAbonneDto } from './dto/create-abonne.dto';
import { UpdateAbonneDto } from './dto/update-abonne.dto';

const MUT = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.MANAGER,
  Role.COMMERCIAL,
  Role.VENDEUR,
] as const;

@Controller('abonnes')
export class AbonnesController {
  constructor(private abonnesService: AbonnesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async search(@Query('q') q?: string) {
    return this.abonnesService.search(q);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.abonnesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  async create(@Body() dto: CreateAbonneDto) {
    return this.abonnesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MUT)
  async update(@Param('id') id: string, @Body() dto: UpdateAbonneDto) {
    return this.abonnesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  async remove(@Param('id') id: string) {
    return this.abonnesService.remove(id);
  }
}
