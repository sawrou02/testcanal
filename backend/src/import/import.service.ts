import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Colonnes du rapport CANAL détaillé (séparateur ;). */
const COL = {
  NUMDIST: 1, NOMDIST: 2, LSALESMAN: 4, NUMABO: 10, DATE: 12, CMOUVMT: 13,
  MONTANT_TTC: 14, CARTICLE: 20, LARTICLE: 21, DEBABO: 22, FINABO: 23, DUREE: 24, NUMDECO: 27,
};

/** DD/MM/YYYY [HH:mm:ss] -> Date. */
function parseDate(s?: string): Date | null {
  if (!s) return null;
  const [d, t] = s.trim().split(/\s+/);
  const m = d?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [hh, mm, ss] = (t || '00:00:00').split(':').map((x) => parseInt(x, 10) || 0);
  return new Date(+m[3], +m[2] - 1, +m[1], hh, mm, ss);
}

function natureFromMouvement(c: string): string {
  switch (c) {
    case 'CREAT': return 'RECRUTEMENT';
    case 'MODART': return 'MIGRATION';
    case 'REAAV': case 'REAAP': case 'PREST': case 'ENCASH': default: return 'REABONNEMENT';
  }
}
function nbMoisFromDuree(d: string): number {
  const m = String(d || '').match(/(\d+)\s*J/i);
  if (m) return Math.max(1, Math.round(parseInt(m[1], 10) / 30));
  return 1;
}
/** Un article commençant par AV = terminal/accessoire (pas une formule). */
const isAccessoire = (carticle: string) => /^AV/i.test(carticle);

interface Line {
  numdist: string; nomdist: string; lsalesman: string; numAbo: string;
  dateStr: string; cmouvmt: string; montant: number; carticle: string;
  larticle: string; finabo: string; duree: string; numdeco: string;
}

@Injectable()
export class ImportService {
  constructor(private prisma: PrismaService) {}

  parse(content: string): Line[] {
    const lines = content.split(/\r?\n/);
    const out: Line[] = [];
    let started = false;
    for (const raw of lines) {
      if (!started) {
        if (raw.startsWith('DISTPRINC')) started = true;
        continue;
      }
      if (!raw || !/^\d/.test(raw)) continue; // ignore titres/groupes/vides
      const f = raw.split(';');
      if (f.length < 25) continue;
      const numAbo = (f[COL.NUMABO] || '').trim();
      if (!numAbo) continue;
      out.push({
        numdist: (f[COL.NUMDIST] || '').trim(),
        nomdist: (f[COL.NOMDIST] || '').trim(),
        lsalesman: (f[COL.LSALESMAN] || '').trim(),
        numAbo,
        dateStr: (f[COL.DATE] || '').trim(),
        cmouvmt: (f[COL.CMOUVMT] || '').trim(),
        montant: parseFloat(f[COL.MONTANT_TTC] || '0') || 0,
        carticle: (f[COL.CARTICLE] || '').trim(),
        larticle: (f[COL.LARTICLE] || '').trim(),
        finabo: (f[COL.FINABO] || '').trim(),
        duree: (f[COL.DUREE] || '').trim(),
        numdeco: (f[COL.NUMDECO] || '').trim(),
      });
    }
    return out;
  }

  async importCanal(content: string, userId: string) {
    const rows = this.parse(content);
    if (rows.length === 0) {
      throw new BadRequestException('Fichier non reconnu (aucune ligne CANAL détectée).');
    }

    // ---- Secteur/localité d'accueil pour les PDV importés ----
    const secteur = await this.prisma.secteur.upsert({
      where: { id: 'sect-import' }, update: {}, create: { id: 'sect-import', nom: 'Réseau (import)' },
    });
    const localite = await this.prisma.localite.upsert({
      where: { id: 'loc-import' }, update: {}, create: { id: 'loc-import', nom: 'Import', secteurId: secteur.id },
    });

    // ---- PDV (par NUMDIST/NOMDIST) ----
    const pdvByCode = new Map<string, string>(); // code -> name
    for (const r of rows) if (r.numdist) pdvByCode.set(r.numdist, r.nomdist || r.numdist);
    const pdvIdByCode = new Map<string, string>();
    for (const [code, name] of pdvByCode) {
      const type = /VAD/i.test(name) ? 'VAD' : 'SOUS_RESEAU';
      const pdv = await this.prisma.pDV.upsert({
        where: { code },
        update: { raisonSociale: name },
        create: { code, raisonSociale: name, type, secteurId: secteur.id, localiteId: localite.id },
      });
      pdvIdByCode.set(code, pdv.id);
    }

    // ---- Formules (articles d'abonnement, hors accessoires) ----
    const formulePrice = new Map<string, { label: string; price: number }>();
    for (const r of rows) {
      if (!r.carticle || isAccessoire(r.carticle)) continue;
      const cur = formulePrice.get(r.carticle);
      if (!cur || r.montant > cur.price) formulePrice.set(r.carticle, { label: r.larticle || r.carticle, price: Math.max(r.montant, cur?.price || 0) });
    }
    const formuleIdByCode = new Map<string, string>();
    for (const [code, { label, price }] of formulePrice) {
      const f = await this.prisma.formule.upsert({
        where: { code },
        update: { nomCommercial: label },
        create: { code, nomCommercial: label, prixMateriel: 0, prixFormule: price },
      });
      formuleIdByCode.set(code, f.id);
    }

    // ---- Regroupement par transaction (numAbo + date exacte) ----
    interface Tx { numAbo: string; pdvCode: string; date: Date; nature: string; carticle: string; finabo: Date | null; duree: string; montant: number; }
    const txByKey = new Map<string, Tx>();
    for (const r of rows) {
      const date = parseDate(r.dateStr);
      if (!date) continue;
      const key = `${r.numAbo}|${r.dateStr}`;
      let tx = txByKey.get(key);
      if (!tx) {
        tx = { numAbo: r.numAbo, pdvCode: r.numdist, date, nature: natureFromMouvement(r.cmouvmt), carticle: '', finabo: parseDate(r.finabo), duree: r.duree, montant: 0 };
        txByKey.set(key, tx);
      }
      tx.montant += r.montant;
      // L'article d'abonnement (non-accessoire) devient l'article principal.
      if (!isAccessoire(r.carticle) && r.carticle) {
        tx.carticle = r.carticle;
        tx.finabo = parseDate(r.finabo) || tx.finabo;
        tx.duree = r.duree;
        tx.nature = natureFromMouvement(r.cmouvmt);
      }
    }
    const txs = [...txByKey.values()].filter((t) => t.carticle && formuleIdByCode.has(t.carticle));

    // ---- Abonnés : dernier état (formule + échéance) par n° abonné ----
    const now = new Date();
    const abState = new Map<string, { pdvCode: string; carticle: string; echeance: Date; latest: Date }>();
    for (const t of txs) {
      const ech = t.finabo || t.date;
      const cur = abState.get(t.numAbo);
      if (!cur || t.date > cur.latest) abState.set(t.numAbo, { pdvCode: t.pdvCode, carticle: t.carticle, echeance: ech, latest: t.date });
    }
    const allNums = [...abState.keys()];
    const existing = await this.prisma.abonne.findMany({ where: { numAbonne: { in: allNums } }, select: { id: true, numAbonne: true } });
    const existingSet = new Set(existing.map((a) => a.numAbonne));

    // Création groupée des nouveaux abonnés
    const toCreate = allNums.filter((n) => !existingSet.has(n)).map((n) => {
      const s = abState.get(n)!;
      return {
        numAbonne: n, nom: 'Abonné', prenom: n, tel1: '',
        formuleId: formuleIdByCode.get(s.carticle)!,
        pdvId: pdvIdByCode.get(s.pdvCode) || pdvIdByCode.values().next().value,
        dateEcheance: s.echeance,
        statut: s.echeance > now ? 'ACTIF' : 'ECHU',
      };
    });
    for (let i = 0; i < toCreate.length; i += 500) {
      await this.prisma.abonne.createMany({ data: toCreate.slice(i, i + 500) as any });
    }
    // Mise à jour de l'échéance/statut des abonnés existants (par lots)
    const upd = existing.map((a) => ({ id: a.id, s: abState.get(a.numAbonne)! }))
      .filter((x) => x.s);
    for (let i = 0; i < upd.length; i += 50) {
      await Promise.all(upd.slice(i, i + 50).map((x) =>
        this.prisma.abonne.update({ where: { id: x.id }, data: { dateEcheance: x.s.echeance, statut: x.s.echeance > now ? 'ACTIF' : 'ECHU', formuleId: formuleIdByCode.get(x.s.carticle) } }).catch(() => undefined),
      ));
    }

    // Map numAbo -> id (tous)
    const allAbo = await this.prisma.abonne.findMany({ where: { numAbonne: { in: allNums } }, select: { id: true, numAbonne: true } });
    const idByNum = new Map(allAbo.map((a) => [a.numAbonne, a.id]));

    // ---- Encaissements (idempotents via importKey) ----
    let created = 0;
    let montantTotal = 0;
    const encData = txs.map((t) => {
      const abonneId = idByNum.get(t.numAbo);
      const pdvId = pdvIdByCode.get(t.pdvCode) || pdvIdByCode.values().next().value;
      const formuleId = formuleIdByCode.get(t.carticle);
      if (!abonneId || !pdvId || !formuleId) return null;
      montantTotal += t.montant;
      return {
        abonneId, pdvId, userId, nature: t.nature, formuleId,
        nbMois: nbMoisFromDuree(t.duree), montantTotal: t.montant, montantRecu: t.montant,
        modePaiement: 'ESPECE', date: t.date,
        recuNumero: `IMP-${t.numAbo}-${t.date.getTime().toString(36)}`,
        importKey: `${t.numAbo}|${t.date.toISOString()}|${t.carticle}`,
      };
    }).filter(Boolean) as any[];
    // Anti-doublon : on écarte les clés d'import déjà présentes (par lots de 400).
    const already = new Set<string>();
    const allKeys = encData.map((e) => e.importKey);
    for (let i = 0; i < allKeys.length; i += 400) {
      const found = await this.prisma.encaissement.findMany({
        where: { importKey: { in: allKeys.slice(i, i + 400) } },
        select: { importKey: true },
      });
      for (const f of found) if (f.importKey) already.add(f.importKey);
    }
    const seen = new Set<string>();
    const fresh = encData.filter((e) => {
      if (already.has(e.importKey) || seen.has(e.importKey)) return false;
      seen.add(e.importKey);
      return true;
    });
    for (let i = 0; i < fresh.length; i += 500) {
      const res = await this.prisma.encaissement.createMany({ data: fresh.slice(i, i + 500) });
      created += res.count;
    }

    return {
      lignes: rows.length,
      transactions: txs.length,
      pdvs: pdvIdByCode.size,
      formules: formuleIdByCode.size,
      abonnesCrees: toCreate.length,
      encaissementsCrees: created,
      montantTotal,
    };
  }
}
