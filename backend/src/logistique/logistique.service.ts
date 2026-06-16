import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateMouvementDto } from './dto/create-mouvement.dto';

const DAY_MS = 86400000;

@Injectable()
export class LogistiqueService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async getStats() {
    const [
      totalDecodeurs,
      enEntrepot,
      enPdv,
      vendus,
      immobilises,
      defectueux,
    ] = await Promise.all([
      this.prisma.decodeur.count(),
      this.prisma.decodeur.count({
        where: { statut: 'EN_STOCK_ENTREPOT' as any },
      }),
      this.prisma.decodeur.count({
        where: { statut: 'EN_STOCK_PDV' as any },
      }),
      this.prisma.decodeur.count({ where: { statut: 'VENDU' as any } }),
      this.prisma.decodeur.count({ where: { statut: 'IMMOBILISE' as any } }),
      this.prisma.decodeur.count({ where: { statut: 'DEFECTUEUX' as any } }),
    ]);

    return {
      totalDecodeurs,
      enEntrepot,
      enPdv,
      vendus,
      immobilises,
      defectueux,
    };
  }

  async findDecodeurs(type?: string, statut?: string, scope?: string) {
    const where: any = {};
    if (type) where.type = type as any;
    if (statut) where.statut = statut as any;
    if (scope === 'entrepot') where.statut = 'EN_STOCK_ENTREPOT' as any;
    else if (scope === 'pdv') where.statut = 'EN_STOCK_PDV' as any;

    return this.prisma.decodeur.findMany({
      where,
      include: {
        entrepot: { select: { code: true, nom: true } },
        pdv: { select: { code: true, raisonSociale: true } },
      },
      orderBy: { numSerie: 'asc' },
      take: 500,
    });
  }

  async rechercheDecodeur(numSerie?: string) {
    if (!numSerie) {
      return { found: false, decodeur: null };
    }

    const include = {
      entrepot: { select: { code: true, nom: true } },
      pdv: { select: { code: true, raisonSociale: true } },
      abonnes: {
        select: {
          numAbonne: true,
          nom: true,
          prenom: true,
          statut: true,
        },
      },
    };

    let decodeur = await this.prisma.decodeur.findUnique({
      where: { numSerie },
      include,
    });

    if (!decodeur) {
      decodeur = await this.prisma.decodeur.findFirst({
        where: { numSerie: { contains: numSerie } },
        include,
      });
    }

    return { found: !!decodeur, decodeur };
  }

  async getImmobilises(type?: string) {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 90 * DAY_MS);

    const where: any = {
      statut: { in: ['EN_STOCK_ENTREPOT', 'EN_STOCK_PDV'] as any },
      dateEntree: { lt: cutoff },
    };
    if (type) where.type = type as any;

    const rows = await this.prisma.decodeur.findMany({
      where,
      include: {
        entrepot: { select: { code: true, nom: true } },
        pdv: { select: { code: true, raisonSociale: true } },
      },
      orderBy: { dateEntree: 'asc' },
    });

    return rows.map((r) => ({
      ...r,
      joursImmobilise: Math.floor(
        (now.getTime() - new Date(r.dateEntree).getTime()) / DAY_MS,
      ),
    }));
  }

  async getInventaire(scope?: string, type?: string) {
    const effectiveScope = scope === 'pdv' ? 'pdv' : 'entrepot';

    if (effectiveScope === 'entrepot') {
      const where: any = { statut: 'EN_STOCK_ENTREPOT' as any };
      if (type) where.type = type as any;

      const grouped = await this.prisma.decodeur.groupBy({
        by: ['entrepotId', 'type'],
        where,
        _count: { _all: true },
      });

      const entrepots = await this.prisma.entrepot.findMany({
        select: { id: true, code: true, nom: true },
      });
      const nameMap = new Map(
        entrepots.map((e) => [e.id, { code: e.code, nom: e.nom }]),
      );

      const acc = new Map<
        string,
        { total: number; z4: number; globaz: number; g11: number }
      >();
      for (const row of grouped) {
        const key = row.entrepotId ?? '';
        if (!key) continue;
        const bucket =
          acc.get(key) ?? { total: 0, z4: 0, globaz: 0, g11: 0 };
        const count = row._count._all;
        bucket.total += count;
        if (row.type === ('Z4' as any)) bucket.z4 += count;
        else if (row.type === ('GLOBAZ' as any)) bucket.globaz += count;
        else if (row.type === ('G11' as any)) bucket.g11 += count;
        acc.set(key, bucket);
      }

      return Array.from(acc.entries()).map(([id, counts]) => ({
        lieu: nameMap.get(id) ?? { code: id, nom: id },
        ...counts,
      }));
    }

    const where: any = { statut: 'EN_STOCK_PDV' as any };
    if (type) where.type = type as any;

    const grouped = await this.prisma.decodeur.groupBy({
      by: ['pdvId', 'type'],
      where,
      _count: { _all: true },
    });

    const pdvs = await this.prisma.pDV.findMany({
      select: { id: true, code: true, raisonSociale: true },
    });
    const nameMap = new Map(
      pdvs.map((p) => [p.id, { code: p.code, nom: p.raisonSociale }]),
    );

    const acc = new Map<
      string,
      { total: number; z4: number; globaz: number; g11: number }
    >();
    for (const row of grouped) {
      const key = row.pdvId ?? '';
      if (!key) continue;
      const bucket = acc.get(key) ?? { total: 0, z4: 0, globaz: 0, g11: 0 };
      const count = row._count._all;
      bucket.total += count;
      if (row.type === ('Z4' as any)) bucket.z4 += count;
      else if (row.type === ('GLOBAZ' as any)) bucket.globaz += count;
      else if (row.type === ('G11' as any)) bucket.g11 += count;
      acc.set(key, bucket);
    }

    return Array.from(acc.entries()).map(([id, counts]) => ({
      lieu: nameMap.get(id) ?? { code: id, nom: id },
      ...counts,
    }));
  }

  async findMouvements() {
    const [rows, entrepots, pdvs] = await Promise.all([
      this.prisma.mouvementStock.findMany({
        orderBy: { date: 'desc' },
        take: 200,
      }),
      this.prisma.entrepot.findMany({ select: { id: true, nom: true } }),
      this.prisma.pDV.findMany({
        select: { id: true, raisonSociale: true },
      }),
    ]);

    const nameMap = new Map<string, string>();
    for (const e of entrepots) nameMap.set(e.id, e.nom);
    for (const p of pdvs) nameMap.set(p.id, p.raisonSociale);

    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      type: r.type,
      materiel: r.materiel,
      quantite: r.quantite,
      numBonLivraison: r.numBonLivraison,
      sourceNom: nameMap.get(r.sourceId) ?? r.sourceId,
      destinationNom: nameMap.get(r.destinationId) ?? r.destinationId,
      statut: r.statut,
    }));
  }

  async createMouvement(
    dto: CreateMouvementDto,
    userId: string,
    ip: string,
  ) {
    const created = await this.prisma.mouvementStock.create({
      data: {
        type: dto.type as any,
        materiel: dto.materiel,
        sourceId: dto.sourceId,
        destinationId: dto.destinationId,
        quantite: dto.quantite,
        numBonLivraison: dto.numBonLivraison,
        date: new Date(dto.date),
      },
    });

    await this.audit.log(userId, 'CREER_MOUVEMENT', 'LOGISTIQUE', ip);

    return created;
  }
}
