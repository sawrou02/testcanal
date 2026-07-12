import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

// Dossier des fichiers uploadés. Configurable via UPLOADS_DIR (déploiement
// cloud : disque persistant), sinon ./uploads à côté du serveur (hors-ligne).
export const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  findAll(category?: string) {
    return this.prisma.document.findMany({
      where: category && category !== 'Tous' ? { category } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    file: { originalname: string; filename: string; mimetype: string; size: number },
    body: { category?: string; description?: string },
    user: { userId?: string; email?: string },
  ) {
    // Corrige l'encodage du nom original (multer le donne parfois en latin1).
    let name = file.originalname;
    try { name = Buffer.from(file.originalname, 'latin1').toString('utf8'); } catch { /* ignore */ }
    return this.prisma.document.create({
      data: {
        filename: name,
        storedName: file.filename,
        mimeType: file.mimetype || '',
        size: file.size || 0,
        category: body.category || 'Général',
        description: body.description || null,
        uploadedById: user?.userId || null,
        uploadedByName: user?.email || '—',
      },
    });
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document introuvable');
    return doc;
  }

  filePath(storedName: string) {
    return path.join(UPLOADS_DIR, storedName);
  }

  async remove(id: string) {
    const doc = await this.findOne(id);
    try { fs.unlinkSync(this.filePath(doc.storedName)); } catch { /* fichier déjà absent */ }
    return this.prisma.document.delete({ where: { id } });
  }
}
