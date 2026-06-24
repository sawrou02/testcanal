import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BaremeUpdate {
  typeCommission: string;
  valeur: number;
  unite?: string;
  actif?: boolean;
}

/** Valeurs par défaut (utilisées si la table est vide). Jamais affichées sans
 *  être d'abord persistées : elles servent de filet de sécurité au calcul. */
export const BAREMES_DEFAUT: Record<string, number> = {
  comm_materielle: 3500,
  comm_formule_abo: 10,
  comm_reabo: 10,
  comm_g11: 8475,
};

@Injectable()
export class BaremesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.parametreCommission.findMany({
      orderBy: { typeCommission: 'asc' },
    });
  }

  /** Retourne une map typeCommission -> valeur (actifs uniquement), avec repli
   *  sur les valeurs par défaut pour tout barème absent. */
  async getMap(): Promise<Record<string, number>> {
    const rows = await this.prisma.parametreCommission.findMany();
    const map: Record<string, number> = { ...BAREMES_DEFAUT };
    for (const r of rows) {
      map[r.typeCommission] = r.actif ? r.valeur : 0;
    }
    return map;
  }

  /** Mise à jour groupée (upsert) — l'admin édite le tableau puis sauvegarde. */
  async updateMany(items: BaremeUpdate[]) {
    const results = [];
    for (const it of items) {
      results.push(
        await this.prisma.parametreCommission.upsert({
          where: { typeCommission: it.typeCommission },
          update: {
            valeur: it.valeur,
            ...(it.unite !== undefined ? { unite: it.unite } : {}),
            ...(it.actif !== undefined ? { actif: it.actif } : {}),
          },
          create: {
            typeCommission: it.typeCommission,
            valeur: it.valeur,
            unite: it.unite ?? 'F',
            actif: it.actif ?? true,
          },
        }),
      );
    }
    return results;
  }
}
