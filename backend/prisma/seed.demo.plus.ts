/**
 * Enrichissement de la base de DÉMONSTRATION (à lancer après seed.demo.ts).
 *
 * Objectif : que le logiciel soit beau à présenter à un client —
 *  - ~240 abonnés supplémentaires avec des échéances étalées (relances remplies)
 *  - ~6 mois d'encaissements (rapport graphique, tendances vs mois dernier)
 *  - des objectifs de recrutement du mois (jauges R/O colorées au dashboard)
 *
 * Idempotent : ré-exécutable sans doublons (numAbonne DEMO-1xxxxx uniques,
 * encaissements protégés par importKey, objectifs vérifiés avant création).
 * Toutes les dates sont RELATIVES à aujourd'hui : la démo reste actuelle.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRENOMS = ['Moussa', 'Awa', 'Ibrahima', 'Fatou', 'Cheikh', 'Aminata', 'Ousmane', 'Mariama', 'Modou', 'Khady', 'Abdou', 'Ndeye', 'Pape', 'Rama', 'Serigne', 'Bineta', 'Alioune', 'Sokhna', 'Babacar', 'Coumba', 'Mamadou', 'Adama', 'Idrissa', 'Yacine'];
const NOMS = ['Diop', 'Ndiaye', 'Fall', 'Ba', 'Sow', 'Gueye', 'Diallo', 'Sarr', 'Cisse', 'Mbaye', 'Faye', 'Kane', 'Sy', 'Toure', 'Seck', 'Diouf', 'Niang', 'Ka', 'Dieng', 'Camara'];

const NB_ABONNES = 240;
const JOURS_HISTORIQUE = 185; // ~6 mois d'encaissements

/** Pseudo-aléatoire déterministe (même résultat à chaque exécution). */
const det = (i: number, mod: number) => ((i * 2654435761) >>> 8) % mod;

async function main() {
  const now = new Date();
  const jour = (offset: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 10, 30);

  const [pdvs, formules, user] = await Promise.all([
    prisma.pDV.findMany({ select: { id: true } }),
    prisma.formule.findMany({ select: { id: true, prixFormule: true } }),
    prisma.user.findFirst({ select: { id: true } }),
  ]);
  if (!pdvs.length || !formules.length || !user) {
    console.log('Base vide — lancez d\'abord seed.demo.ts');
    return;
  }

  // ---------- 1) Abonnés supplémentaires (échéances étalées -25 j .. +55 j) ----------
  const existants = new Set(
    (await prisma.abonne.findMany({
      where: { numAbonne: { startsWith: 'DEMO-1' } },
      select: { numAbonne: true },
    })).map((a) => a.numAbonne),
  );

  const nouveaux = [];
  for (let i = 0; i < NB_ABONNES; i++) {
    const num = `DEMO-${100000 + i}`;
    if (existants.has(num)) continue;
    const echJours = -25 + det(i, 81); // -25 .. +55 jours
    const echeance = jour(echJours);
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
  if (nouveaux.length) await prisma.abonne.createMany({ data: nouveaux });
  console.log(`Abonnés démo : ${nouveaux.length} créés (${NB_ABONNES - nouveaux.length} déjà présents)`);

  // ---------- 2) Encaissements sur ~6 mois (idempotents via importKey) ----------
  const abonnes = await prisma.abonne.findMany({
    where: { numAbonne: { startsWith: 'DEMO-1' } },
    select: { id: true, pdvId: true, formuleId: true },
  });
  const prixByFormule = new Map(formules.map((f) => [f.id, f.prixFormule || 5000]));

  const rows = [];
  let idx = 0;
  for (let d = JOURS_HISTORIQUE; d >= 1; d--) {
    // Volume quotidien 2..6, légèrement croissant vers aujourd'hui (tendance +).
    const boost = d < 45 ? 1 : 0;
    const nbOps = 2 + det(d, 4) + boost;
    for (let k = 0; k < nbOps; k++) {
      const a = abonnes[det(idx + 13, abonnes.length)];
      const r = det(idx, 100);
      const nature = r < 36 ? 'RECRUTEMENT' : r < 88 ? 'REABONNEMENT' : r < 97 ? 'MIGRATION' : 'IMPAYE';
      const nbMois = [1, 1, 1, 2, 3, 6, 12][det(idx + 3, 7)];
      const montant = (prixByFormule.get(a.formuleId) || 5000) * nbMois;
      rows.push({
        abonneId: a.id,
        pdvId: a.pdvId,
        userId: user.id,
        nature,
        formuleId: a.formuleId,
        nbMois,
        montantTotal: montant,
        montantRecu: montant,
        modePaiement: ['ESPECE', 'WAVE', 'ORANGE_MONEY', 'ESPECE', 'WAVE'][det(idx + 1, 5)],
        options: '{}',
        date: jour(-d),
        recuNumero: `DEMO-R${idx}`,
        importKey: `demoplus-${idx}`,
      });
      idx++;
    }
  }

  // Filtre les clés déjà importées (SQLite ne supporte pas skipDuplicates).
  const dejaLa = new Set<string>();
  for (let i = 0; i < rows.length; i += 400) {
    const chunk = rows.slice(i, i + 400).map((r) => r.importKey);
    const found = await prisma.encaissement.findMany({
      where: { importKey: { in: chunk } },
      select: { importKey: true },
    });
    for (const f of found) if (f.importKey) dejaLa.add(f.importKey);
  }
  const aCreer = rows.filter((r) => !dejaLa.has(r.importKey));
  for (let i = 0; i < aCreer.length; i += 400) {
    await prisma.encaissement.createMany({ data: aCreer.slice(i, i + 400) });
  }
  console.log(`Encaissements démo : ${aCreer.length} créés sur ~6 mois (${dejaLa.size} déjà présents)`);

  // ---------- 3) Objectifs de recrutement du mois courant (jauges R/O) ----------
  const annee = now.getFullYear();
  const mois1 = now.getMonth() + 1;
  let objCrees = 0;
  for (let i = 0; i < pdvs.length; i++) {
    const deja = await prisma.objectifPdv.findFirst({
      where: { pdvId: pdvs[i].id, annee, mois: mois1, typeObjectif: 'RECRUTEMENT' },
    });
    if (deja) continue;
    await prisma.objectifPdv.create({
      data: {
        pdvId: pdvs[i].id,
        annee,
        mois: mois1,
        typeObjectif: 'RECRUTEMENT',
        effectif: 8 + det(i, 18),
        createdById: user.id,
      },
    });
    objCrees++;
  }
  console.log(`Objectifs PDV du mois : ${objCrees} créés`);

  console.log('\nBase de DÉMONSTRATION enrichie — prête à présenter.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
