import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async search(@Query('q') q?: string) {
    const term = (q ?? '').trim();
    if (term.length < 2) return { abonnes: [], pdvs: [], decodeurs: [] };
    const like = { contains: term, mode: 'insensitive' as const };
    const [abonnes, pdvs, decodeurs] = await Promise.all([
      this.prisma.abonne.findMany({
        where: { OR: [{ numAbonne: like }, { nom: like }, { prenom: like }, { tel1: like }] },
        select: { id: true, numAbonne: true, nom: true, prenom: true }, take: 6,
      }),
      this.prisma.pDV.findMany({
        where: { OR: [{ code: like }, { raisonSociale: like }] },
        select: { id: true, code: true, raisonSociale: true }, take: 6,
      }),
      this.prisma.decodeur.findMany({
        where: { numSerie: like },
        select: { id: true, numSerie: true, type: true, statut: true }, take: 6,
      }),
    ]);
    return { abonnes, pdvs, decodeurs };
  }
}
