import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { ImportService } from './import.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

class ImportDto {
  @IsString()
  content: string;
}

@Controller('import')
export class ImportController {
  constructor(private svc: ImportService) {}

  @Post('canal')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  async canal(@Body() dto: ImportDto, @Req() req: any) {
    const userId = req.user?.userId;
    return this.svc.importCanal(dto.content, userId);
  }
}
