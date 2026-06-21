import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BanquesService } from './banques.service';
import { CreateBanqueDto } from './dto/create-banque.dto';
import { UpdateBanqueDto } from './dto/update-banque.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('banques')
export class BanquesController {
  constructor(private banquesService: BanquesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll() {
    return this.banquesService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  async create(@Body() dto: CreateBanqueDto) {
    return this.banquesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  async update(@Param('id') id: string, @Body() dto: UpdateBanqueDto) {
    return this.banquesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.banquesService.remove(id);
  }
}
