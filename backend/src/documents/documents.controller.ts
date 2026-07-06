import {
  Body, Controller, Delete, Get, Param, Post, Query, Req, Res, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Response } from 'express';
import { DocumentsService, UPLOADS_DIR } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

const MUT = [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.COMPTABLE, Role.LOGISTICIEN, Role.COMMERCIAL] as const;

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private svc: DocumentsService) {}

  @Get()
  findAll(@Query('category') category?: string) {
    return this.svc.findAll(category);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(...MUT)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, cb) =>
          cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 30 * 1024 * 1024 },
    }),
  )
  create(@UploadedFile() file: any, @Body() body: any, @Req() req: any) {
    return this.svc.create(file, body, req.user);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const doc = await this.svc.findOne(id);
    return res.download(this.svc.filePath(doc.storedName), doc.filename);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
