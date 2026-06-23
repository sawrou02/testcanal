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

/** Ajoute `n` mois à une date (gère le passage d'année). */
function addMonths(base: Date, n: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + n);
  return d;
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
      select: { numAbonne: true, dateEcheance: true },
    });

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const ref = abonne?.numAbonne || dto.abonneId.slice(0, 6);
    const unique = Date.now().toString(36).slice(-4).toUpperCase();
    const recuNumero = `RC-${ref}-${dd}${mm}-${unique}`;

    // ----- Réabonnement intelligent (Niveau 1) -----
    // On prolonge l'échéance à partir de la date la plus tardive entre
    // aujourd'hui et l'échéance actuelle (un client encore actif ne perd pas
    // les jours restants ; un client échu repart d'aujourd'hui).
    const baseEcheance =
      abonne && abonne.dateEcheance > now ? new Date(abonne.dateEcheance) : new Date(now);
    const nouvelleEcheance = addMonths(baseEcheance, dto.nbMois);

    // Mise à jour de l'abonné : nouvelle échéance + réactivation. Le canal de
    // réabonnement n'est renseigné que pour un vrai réabonnement.
    const abonneUpdate: {
      dateEcheance: Date;
      statut: string;
      canalReabo?: string;
    } = {
      dateEcheance: nouvelleEcheance,
      statut: 'ACTIF',
    };
    if (dto.nature === 'REABONNEMENT') {
      abonneUpdate.canalReabo = dto.modePaiement;
    }

    // Tout est écrit en une seule transaction : soit tout réussit, soit rien
    // (pas d'encaissement enregistré sans mise à jour de l'abonné et du PDV).
    const [record] = await this.prisma.$transaction([
      this.prisma.encaissement.create({
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
      }),
      this.prisma.pDV.update({
        where: { id: dto.pdvId },
        data: { soldeActuel: { increment: montantTotal } },
      }),
      this.prisma.abonne.update({
        where: { id: dto.abonneId },
        data: abonneUpdate as any,
      }),
    ]);

    return { ...parseOptions(record), monnaieRendue, nouvelleEcheance };
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
