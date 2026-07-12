import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Données de DÉMONSTRATION chargeables/retirables depuis l'interface (admin).
 *
 * Toutes les lignes créées sont TAGUÉES :
 *  - abonnés  : numAbonne commence par "DEMO-"
 *  - encaissements : importKey commence par "demoplus-"
 * → le retrait ne touche QUE ces lignes, jamais les vraies données.
 *
 * Dates relatives à aujourd'hui : la démo reste toujours actuelle.
 */
const NB_ABONNES = 240;
const JOURS_HISTORIQUE = 185; // ~6 mois

const PRENOMS = ['Moussa', 'Awa', 'Ibrahima', 'Fatou', 'Cheikh', 'Aminata', 'Ousmane', 'Mariama', 'Modou', 'Khady', 'Abdou', 'Ndeye', 'Pape', 'Rama', 'Serigne', 'Bineta', 'Alioune', 'Sokhna', 'Babacar', 'Coumba', 'Mamadou', 'Adama', 'Idrissa', 'Yacine'];
const NOMS = ['Diop', 'Ndiaye', 'Fall', 'Ba', 'Sow', 'Gueye', 'Diallo', 'Sarr', 'Cisse', 'Mbaye', 'Faye', 'Kane', 'Sy', 'Toure', 'Seck', 'Diouf', 'Niang', 'Ka', 'Dieng', 'Camara'];

/** Pseudo-aléatoire déterministe. */
const det = (i: number, mod: number) => ((i * 2654435761) >>> 8) % mod;

@Injectable()
export class DemoService {
  private readonly logger = new Logger('Demo');
  constructor(private prisma: PrismaService) {}

  /** Compte des données de démonstration présentes. */
  async status() {
    const [abonnes, encaissements] = await Promise.all([
      this.prisma.abonne.count({ where: { numAbonne: { startsWith: 'DEMO-' } } }),
      this.prisma.encaissement.count({ where: { importKey: { startsWith: 'demoplus-' } } }),
    ]);
    return { abonnes, encaissements, present: abonnes > 0 || encaissements > 0 };
  }

  /**
   * Garantit un minimum de référentiels (secteur, localité, PDV, formules)
   * pour que la démo fonctionne même sur une base neuve sans PDV.
   * Tout est tagué démo (PDV code « DEMO-PDV-… », secteur/localité « Démonstration »)
   * afin d'être retiré proprement plus tard.
   */
  private async ensureReferentiels() {
    // Formules : créées par le seed de base ; on en fabrique au besoin.
    let formules = await this.prisma.formule.findMany({ select: { id: true, prixFormule: true } });
    if (!formules.length) {
      await this.prisma.formule.createMany({
        data: [
          { code: 'ACCESS', nomCommercial: 'Access', prixMateriel: 15000, prixFormule: 5000 },
          { code: 'EVASION', nomCommercial: 'Évasion', prixMateriel: 15000, prixFormule: 10000 },
          { code: 'TOUT CANAL', nomCommercial: 'Tout Canal', prixMateriel: 15000, prixFormule: 25000 },
          { code: 'PRESTIGE', nomCommercial: 'Prestige', prixMateriel: 20000, prixFormule: 35000 },
        ],
      });
      formules = await this.prisma.formule.findMany({ select: { id: true, prixFormule: true } });
    }

    // PDV : si aucun n'existe, on crée des PDV de démonstration (avec secteur/localité).
    let pdvs = await this.prisma.pDV.findMany({ select: { id: true } });
    if (!pdvs.length) {
      let secteur = await this.prisma.secteur.findFirst({ select: { id: true } });
      if (!secteur) secteur = await this.prisma.secteur.create({ data: { nom: 'Démonstration' }, select: { id: true } });
      let localite = await this.prisma.localite.findFirst({ where: { secteurId: secteur.id }, select: { id: true } });
      if (!localite) localite = await this.prisma.localite.create({ data: { nom: 'Démonstration', secteurId: secteur.id }, select: { id: true } });

      const noms = ['Boutique Centre', 'Agence Nord', 'Réseau Sud', 'Point Vente Est', 'Apporteur Ouest', 'Boutique Plateau', 'Agence Marché', 'Réseau Corniche'];
      await this.prisma.pDV.createMany({
        data: noms.map((raisonSociale, i) => ({
          code: `DEMO-PDV-${i + 1}`,
          raisonSociale,
          type: i % 3 === 0 ? 'AGENCE_PRINCIPALE' : i % 3 === 1 ? 'BOUTIQUE_PROPRE' : 'SOUS_RESEAU',
          secteurId: secteur!.id,
          localiteId: localite!.id,
        })),
      });
      pdvs = await this.prisma.pDV.findMany({ select: { id: true } });
    }

    return { formules, pdvs };
  }

  /** Charge les données de démonstration (idempotent). */
  async load() {
    const now = new Date();
    const jour = (offset: number) =>
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 10, 30);

    const user = await this.prisma.user.findFirst({ select: { id: true } });
    if (!user) {
      return { ok: false, message: 'Aucun utilisateur en base (relancez l’installation).' };
    }
    const { formules, pdvs } = await this.ensureReferentiels();
    if (!formules.length || !pdvs.length) {
      return { ok: false, message: 'Impossible de préparer les référentiels de démonstration.' };
    }

    // 1) Abonnés (échéances étalées -25 j .. +55 j)
    const existants = new Set(
      (await this.prisma.abonne.findMany({
        where: { numAbonne: { startsWith: 'DEMO-' } },
        select: { numAbonne: true },
      })).map((a) => a.numAbonne),
    );
    const nouveaux = [];
    for (let i = 0; i < NB_ABONNES; i++) {
      const num = `DEMO-${100000 + i}`;
      if (existants.has(num)) continue;
      const echeance = jour(-25 + det(i, 81));
      const statut = echeance < now ? 'ECHU' : det(i, 20) === 0 ? 'SUSPENDU' : 'ACTIF';
      nouveaux.push({
        numAbonne: num,
        prenom: PRENOMS[det(i, PRENOMS.length)],
        nom: NOMS[det(i + 7, NOMS.length)],
        tel1: `7${6 + det(i, 3)} ${String(100 + det(i, 900)).padStart(3, '0')} ${String(10 + det(i + 3, 90)).padStart(2, '0')} ${String(10 + det(i + 11, 90)).padStart(2, '0')}`,
        formuleId: formules[det(i, formules.length)].id,
        pdvId: pdvs[det(i + 5, pdvs.length)].id,
        dateEcheance: echeance,
        statut,
      });
    }
    if (nouveaux.length) await this.prisma.abonne.createMany({ data: nouveaux });

    // 2) Encaissements sur ~6 mois (idempotents via importKey)
    const abonnes = await this.prisma.abonne.findMany({
      where: { numAbonne: { startsWith: 'DEMO-' } },
      select: { id: true, pdvId: true, formuleId: true },
    });
    const prixByFormule = new Map(formules.map((f) => [f.id, f.prixFormule || 5000]));
    const rows = [];
    let idx = 0;
    for (let d = JOURS_HISTORIQUE; d >= 1; d--) {
      const boost = d < 45 ? 1 : 0;
      const nbOps = 2 + det(d, 4) + boost;
      for (let k = 0; k < nbOps; k++) {
        const a = abonnes[det(idx + 13, abonnes.length)];
        const r = det(idx, 100);
        const nature = r < 36 ? 'RECRUTEMENT' : r < 88 ? 'REABONNEMENT' : r < 97 ? 'MIGRATION' : 'IMPAYE';
        const nbMois = [1, 1, 1, 2, 3, 6, 12][det(idx + 3, 7)];
        const montant = (prixByFormule.get(a.formuleId) || 5000) * nbMois;
        rows.push({
          abonneId: a.id, pdvId: a.pdvId, userId: user.id, nature,
          formuleId: a.formuleId, nbMois, montantTotal: montant, montantRecu: montant,
          modePaiement: ['ESPECE', 'WAVE', 'ORANGE_MONEY', 'ESPECE', 'WAVE'][det(idx + 1, 5)],
          options: '{}', date: jour(-d), recuNumero: `DEMO-R${idx}`, importKey: `demoplus-${idx}`,
        });
        idx++;
      }
    }
    const dejaLa = new Set<string>();
    for (let i = 0; i < rows.length; i += 400) {
      const chunk = rows.slice(i, i + 400).map((x) => x.importKey);
      const found = await this.prisma.encaissement.findMany({
        where: { importKey: { in: chunk } }, select: { importKey: true },
      });
      for (const f of found) if (f.importKey) dejaLa.add(f.importKey);
    }
    const aCreer = rows.filter((x) => !dejaLa.has(x.importKey));
    for (let i = 0; i < aCreer.length; i += 400) {
      await this.prisma.encaissement.createMany({ data: aCreer.slice(i, i + 400) as any });
    }

    this.logger.log(`Démo chargée : +${nouveaux.length} abonnés, +${aCreer.length} encaissements`);
    const st = await this.status();
    return { ok: true, abonnesCrees: nouveaux.length, encaissementsCrees: aCreer.length, ...st };
  }

  /** Retire UNIQUEMENT les données de démonstration (les vraies sont intactes). */
  async clear() {
    // Encaissements démo d'abord (clé étrangère), puis abonnés démo.
    const enc = await this.prisma.encaissement.deleteMany({
      where: { importKey: { startsWith: 'demoplus-' } },
    });
    // Supprime aussi d'éventuels encaissements liés aux abonnés démo (sécurité).
    const demoAbonnes = await this.prisma.abonne.findMany({
      where: { numAbonne: { startsWith: 'DEMO-' } }, select: { id: true },
    });
    const ids = demoAbonnes.map((a) => a.id);
    if (ids.length) {
      await this.prisma.encaissement.deleteMany({ where: { abonneId: { in: ids } } });
    }
    const abo = await this.prisma.abonne.deleteMany({
      where: { numAbonne: { startsWith: 'DEMO-' } },
    });

    // PDV de démonstration (créés uniquement quand la base n'avait aucun PDV).
    let pdvSupprimes = 0;
    const demoPdvs = await this.prisma.pDV.findMany({
      where: { code: { startsWith: 'DEMO-PDV-' } },
      select: { id: true, secteurId: true, localiteId: true },
    });
    if (demoPdvs.length) {
      const res = await this.prisma.pDV.deleteMany({ where: { code: { startsWith: 'DEMO-PDV-' } } }).catch(() => ({ count: 0 }));
      pdvSupprimes = res.count;
      // Secteur/localité « Démonstration » s'ils sont désormais vides.
      await this.prisma.localite.deleteMany({ where: { nom: 'Démonstration', pdvs: { none: {} } } }).catch(() => undefined);
      await this.prisma.secteur.deleteMany({ where: { nom: 'Démonstration', pdvs: { none: {} } } }).catch(() => undefined);
    }

    this.logger.log(`Démo retirée : -${abo.count} abonnés, -${enc.count} encaissements, -${pdvSupprimes} PDV`);
    return { ok: true, abonnesSupprimes: abo.count, encaissementsSupprimes: enc.count, pdvSupprimes };
  }
}
