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
import { ObjectifsService } from './objectifs.service';
import { CreateObjectifDto, UpdateObjectifDto } from './dto/create-objectif.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('objectifs')
export class ObjectifsController {
  constructor(private objectifsService: ObjectifsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Query('periode') periode?: string) {
    return this.objectifsService.findAll(periode);
  }

  @Get('suivi')
  @UseGuards(JwtAuthGuard)
  suivi(@Query('periode') periode?: string) {
    return this.objectifsService.suivi(periode);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  create(@Body() dto: CreateObjectifDto) {
    return this.objectifsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateObjectifDto) {
    return this.objectifsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  remove(@Param('id') id: string) {
    return this.objectifsService.remove(id);
  }
}
