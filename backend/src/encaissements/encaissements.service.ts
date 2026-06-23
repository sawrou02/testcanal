import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEncaissementDto } from './dto/create-encaissement.dto';
import { computeEncaissement, OPTION_PRICES } from '../domain/calculations';

export { OPTION_PRICES };

const ENCAISSEMENT_INCLUDE = {
  abonne: { select: { numAbonne: true, nom: true, prenom: true } },
  pdv: { select: { raisonSociale: true } },
  formule: { select: { code: true, nomCommercial: true } },
  user: { select: { prenom: true, nom: true } },
};

/**
 * `options` est stocké en TEXTE (JSON sérialisé) car SQLite n'a pas de type
 * Json natif. On le re-parse en objet avant de renvoyer au frontend.
 */
function parseOptions<T extends { options: string }>(rec: T): Omit<T, 'options'> & { options: unknown } {
  let parsed: unknown = {};
  try {
    parsed = rec.options ? JSON.parse(rec.options) : {};
  } catch {
    parsed = {};
  }
  return { ...rec, options: parsed };
}

@Injectable()
export class EncaissementsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEncaissementDto, userId: string) {
    const formule = await this.prisma.formule.findUniqueOrThrow({
      where: { id: dto.formuleId },
    });

    const options = dto.options || {};
    const { montantTotal, monnaieRendue } = computeEncaissement(
      formule.prixFormule,
      dto.nbMois,
      options,
      dto.montantRecu,
    );

    if (monnaieRendue < 0) {
      throw new BadRequestException('Montant reçu insuffisant');
    }

    const abonne = await this.prisma.abonne.findUnique({
      where: { id: dto.abonneId },
      select: { numAbonne: true },
    });

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const ref = abonne?.numAbonne || dto.abonneId.slice(0, 6);
    const unique = Date.now().toString(36).slice(-4).toUpperCase();
    const recuNumero = `RC-${ref}-${dd}${mm}-${unique}`;

    const record = await this.prisma.encaissement.create({
      data: {
        abonneId: dto.abonneId,
        pdvId: dto.pdvId,
        userId,
        nature: dto.nature as any,
        formuleId: dto.formuleId,
        nbMois: dto.nbMois,
        montantTotal,
        montantRecu: dto.montantRecu,
        modePaiement: dto.modePaiement as any,
        options: JSON.stringify(options),
        date: now,
        recuNumero,
      },
      include: ENCAISSEMENT_INCLUDE,
    });

    await this.prisma.pDV.update({
      where: { id: dto.pdvId },
      data: { soldeActuel: { increment: montantTotal } },
    });

    return { ...parseOptions(record), monnaieRendue };
  }

  async findAll(pdvId?: string) {
    const where: any = {};
    if (pdvId) {
      where.pdvId = pdvId;
    }

    const rows = await this.prisma.encaissement.findMany({
      where,
      include: ENCAISSEMENT_INCLUDE,
      orderBy: { date: 'desc' },
      take: 100,
    });
    return rows.map(parseOptions);
  }

  async findOne(id: string) {
    const rec = await this.prisma.encaissement.findUnique({
      where: { id },
      include: ENCAISSEMENT_INCLUDE,
    });
    return rec ? parseOptions(rec) : rec;
  }
}
