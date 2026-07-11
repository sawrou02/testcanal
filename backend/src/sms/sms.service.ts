import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Nombre maximal de SMS envoyés en une passe (garde-fou anti-emballement). */
const MAX_PAR_PASSE = 1000;
/** Concurrence d'envoi (nombre de requêtes HTTP simultanées). */
const CONCURRENCE = 5;

export interface SmsConfig {
  provider: string;
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  sender: string;
  actif: boolean;
  envoiAuto: boolean;
}

export interface EnvoiResultat {
  sent: number;
  failed: number;
  simulated: boolean; // true = passerelle non configurée, rien n'est réellement parti
}

/** Un message prêt à partir. */
export interface SmsMessage {
  to: string; // numéro au format international sans '+', ex. 221771234567
  body: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger('SMS');

  constructor(private prisma: PrismaService) {}

  /** Lit (ou crée) la configuration unique de la passerelle. */
  async getConfig(): Promise<SmsConfig> {
    const row = await this.prisma.configSms.upsert({
      where: { id: 'sms' },
      update: {},
      create: { id: 'sms' },
    });
    return {
      provider: row.provider,
      apiUrl: row.apiUrl,
      apiKey: row.apiKey,
      apiSecret: row.apiSecret,
      sender: row.sender,
      actif: row.actif,
      envoiAuto: row.envoiAuto,
    };
  }

  /** Config « publique » : la clé/secret ne sont jamais renvoyés en clair. */
  async getConfigPublic() {
    const c = await this.getConfig();
    return {
      provider: c.provider,
      apiUrl: c.apiUrl,
      sender: c.sender,
      actif: c.actif,
      envoiAuto: c.envoiAuto,
      apiKeyDefinie: c.apiKey.length > 0,
      apiSecretDefini: c.apiSecret.length > 0,
    };
  }

  /** Enregistre la config. Les champs clé/secret vides sont ignorés (on garde l'existant). */
  async saveConfig(dto: Partial<SmsConfig>): Promise<{ ok: true }> {
    const data: Record<string, unknown> = {};
    if (dto.provider !== undefined) data.provider = dto.provider;
    if (dto.apiUrl !== undefined) data.apiUrl = dto.apiUrl.trim();
    if (dto.sender !== undefined) data.sender = dto.sender.trim();
    if (dto.actif !== undefined) data.actif = dto.actif;
    if (dto.envoiAuto !== undefined) data.envoiAuto = dto.envoiAuto;
    // On ne remplace la clé/secret que si une nouvelle valeur non vide est fournie.
    if (dto.apiKey !== undefined && dto.apiKey.trim() !== '') data.apiKey = dto.apiKey.trim();
    if (dto.apiSecret !== undefined && dto.apiSecret.trim() !== '') data.apiSecret = dto.apiSecret.trim();

    await this.prisma.configSms.upsert({
      where: { id: 'sms' },
      update: data,
      create: { id: 'sms', ...data },
    });
    return { ok: true };
  }

  /** Passerelle réellement prête à envoyer ? */
  private estOperationnelle(c: SmsConfig): boolean {
    if (!c.actif) return false;
    if (c.provider === 'TWILIO') return !!(c.apiKey && c.apiSecret);
    if (c.provider === 'AFRICASTALKING') return !!(c.apiKey && c.apiSecret);
    // ORANGE / CUSTOM : URL + clé suffisent.
    return !!(c.apiUrl && c.apiKey);
  }

  /**
   * Envoie une liste de messages. Si la passerelle n'est pas opérationnelle,
   * ne fait qu'une simulation (compte les messages, n'appelle aucun service).
   */
  async envoyer(messages: SmsMessage[]): Promise<EnvoiResultat> {
    const valides = messages.filter((m) => m.to && m.body);
    const c = await this.getConfig();

    if (!this.estOperationnelle(c)) {
      return { sent: valides.length, failed: 0, simulated: true };
    }

    const lot = valides.slice(0, MAX_PAR_PASSE);
    if (valides.length > MAX_PAR_PASSE) {
      this.logger.warn(`Envoi plafonné à ${MAX_PAR_PASSE} sur ${valides.length} messages.`);
    }

    let sent = 0;
    let failed = 0;
    // Envoi par petits paquets pour ne pas saturer la passerelle.
    for (let i = 0; i < lot.length; i += CONCURRENCE) {
      const paquet = lot.slice(i, i + CONCURRENCE);
      const res = await Promise.all(
        paquet.map((m) => this.envoyerUn(c, m).then(() => true).catch(() => false)),
      );
      for (const ok of res) ok ? sent++ : failed++;
    }
    this.logger.log(`SMS envoyés : ${sent} ok, ${failed} échec(s) via ${c.provider}`);
    return { sent, failed, simulated: false };
  }

  /** Envoie un seul SMS selon le fournisseur configuré. Lève en cas d'échec HTTP. */
  private async envoyerUn(c: SmsConfig, m: SmsMessage): Promise<void> {
    let url = c.apiUrl;
    const headers: Record<string, string> = {};
    let body: string;

    if (c.provider === 'TWILIO') {
      // apiKey = Account SID, apiSecret = Auth Token
      url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(c.apiKey)}/Messages.json`;
      headers['Authorization'] =
        'Basic ' + Buffer.from(`${c.apiKey}:${c.apiSecret}`).toString('base64');
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      body = new URLSearchParams({ To: `+${m.to}`, From: c.sender, Body: m.body }).toString();
    } else if (c.provider === 'AFRICASTALKING') {
      // apiKey = API key, apiSecret = username
      url = c.apiUrl || 'https://api.africastalking.com/version1/messaging';
      headers['apiKey'] = c.apiKey;
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Accept'] = 'application/json';
      const params: Record<string, string> = { username: c.apiSecret, to: `+${m.to}`, message: m.body };
      if (c.sender) params.from = c.sender;
      body = new URLSearchParams(params).toString();
    } else {
      // ORANGE / CUSTOM : POST JSON { to, from, message }, jeton Bearer.
      headers['Authorization'] = `Bearer ${c.apiKey}`;
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify({ to: m.to, from: c.sender, message: m.body });
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const resp = await fetch(url, { method: 'POST', headers, body, signal: ctrl.signal });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(`HTTP ${resp.status} ${txt.slice(0, 200)}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  /** Envoie un SMS d'essai à un numéro. */
  async tester(numero: string): Promise<EnvoiResultat> {
    const to = normaliserNumero(numero);
    if (!to) return { sent: 0, failed: 1, simulated: false };
    return this.envoyer([
      { to, body: 'SENDISTRI : ceci est un SMS de test. La passerelle est bien configurée.' },
    ]);
  }
}

/** Normalise un numéro sénégalais au format international sans '+'. */
export function normaliserNumero(tel?: string): string {
  let d = (tel || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00221')) return d.slice(2);
  if (d.startsWith('221')) return d;
  d = d.replace(/^0+/, '');
  if (d.length === 9) return '221' + d;
  return d;
}
