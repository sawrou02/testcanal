import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

class MessageDto {
  @IsString() @MinLength(1) @MaxLength(2000)
  content: string;
}

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list() {
    return this.prisma.message.findMany({ orderBy: { createdAt: 'asc' }, take: 300 });
  }

  @Post()
  async create(@Body() dto: MessageDto, @Req() req: any) {
    const u = req.user || {};
    return this.prisma.message.create({
      data: {
        userId: u.userId || 'inconnu',
        userName: u.email || 'Utilisateur',
        content: dto.content.trim(),
      },
    });
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  async remove(@Param('id') id: string) {
    return this.prisma.message.delete({ where: { id } }).catch(() => ({ id }));
  }
}
