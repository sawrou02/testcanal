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

    const isImpaye = dto.nature === 'IMPAYE';
    const options = dto.options || {};
    let { montantTotal, monnaieRendue } = computeEncaissement(
      formule.prixFormule,
      dto.nbMois,
      options,
      dto.montantRecu,
    );

    // Un IMPAYÉ est un règlement partiel/arriéré : le montant enregistré est
    // simplement la somme reçue, sans exiger le prix complet de la formule.
    if (isImpaye) {
      montantTotal = dto.montantRecu;
      monnaieRendue = 0;
    } else if (monnaieRendue < 0) {
      throw new BadRequestException('Montant reçu insuffisant');
    }

    const abonne = await this.prisma.abonne.findUnique({
      where: { id: dto.abonneId },
      select: { numAbonne: true, dateEcheance: true },
    });

    const now = new Date();
    // Date de l'opération : saisie manuelle si fournie, sinon date système.
    const opDate = dto.datePaiement ? new Date(dto.datePaiement) : now;
    const dd = String(opDate.getDate()).padStart(2, '0');
    const mm = String(opDate.getMonth() + 1).padStart(2, '0');
    const ref = abonne?.numAbonne || dto.abonneId.slice(0, 6);
    const unique = Date.now().toString(36).slice(-4).toUpperCase();
    const recuNumero = `RC-${ref}-${dd}${mm}-${unique}`;

    // ----- Réabonnement intelligent (Niveau 1) -----
    // Un IMPAYÉ enregistre une dette : il ne prolonge PAS l'abonnement et ne
    // réactive PAS l'abonné. Les autres natures prolongent l'échéance.
    const baseEcheance =
      abonne && abonne.dateEcheance > opDate ? new Date(abonne.dateEcheance) : new Date(opDate);
    const nouvelleEcheance = isImpaye
      ? abonne?.dateEcheance ?? opDate
      : addMonths(baseEcheance, dto.nbMois);

    // Champs additionnels de l'abonné (toujours mis à jour si fournis).
    const abonneUpdate: Record<string, unknown> = {};
    if (!isImpaye) {
      abonneUpdate.dateEcheance = nouvelleEcheance;
      abonneUpdate.statut = 'ACTIF';
      if (dto.nature === 'REABONNEMENT') abonneUpdate.canalReabo = dto.modePaiement;
    }
    if (dto.numeroContrat !== undefined) abonneUpdate.numeroContrat = dto.numeroContrat || null;
    if (dto.dateProchainRdv) abonneUpdate.dateProchainRdv = new Date(dto.dateProchainRdv);
    if (dto.tel2 !== undefined) abonneUpdate.tel2 = dto.tel2 || null;

    // Tout est écrit en une seule transaction : soit tout réussit, soit rien
    // (pas d'encaissement enregistré sans mise à jour de l'abonné et du PDV).
    const ops: any[] = [
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
          date: opDate,
          recuNumero,
        },
        include: ENCAISSEMENT_INCLUDE,
      }),
      this.prisma.pDV.update({
        where: { id: dto.pdvId },
        data: { soldeActuel: { increment: montantTotal } },
      }),
    ];
    // On ne touche à l'abonné que s'il y a quelque chose à mettre à jour.
    if (Object.keys(abonneUpdate).length > 0) {
      ops.push(
        this.prisma.abonne.update({
          where: { id: dto.abonneId },
          data: abonneUpdate as any,
        }),
      );
    }
    const [record] = await this.prisma.$transaction(ops);

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
