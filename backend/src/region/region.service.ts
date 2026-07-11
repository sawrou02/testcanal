import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RegionConfig {
  pays: string;
  devise: string;
  symbole: string;
  symboleAvant: boolean;
  decimales: number;
  langue: string;
  locale: string;
}

@Injectable()
export class RegionService {
  constructor(private prisma: PrismaService) {}

  /** Lit (ou crée) la configuration régionale unique. */
  async getConfig(): Promise<RegionConfig> {
    const r = await this.prisma.configRegion.upsert({
      where: { id: 'region' },
      update: {},
      create: { id: 'region' },
    });
    return {
      pays: r.pays,
      devise: r.devise,
      symbole: r.symbole,
      symboleAvant: r.symboleAvant,
      decimales: r.decimales,
      langue: r.langue,
      locale: r.locale,
    };
  }

  async saveConfig(dto: Partial<RegionConfig>): Promise<RegionConfig> {
    const data: Record<string, unknown> = {};
    if (dto.pays !== undefined) data.pays = String(dto.pays).trim();
    if (dto.devise !== undefined) data.devise = String(dto.devise).trim();
    if (dto.symbole !== undefined) data.symbole = String(dto.symbole).trim();
    if (dto.symboleAvant !== undefined) data.symboleAvant = !!dto.symboleAvant;
    if (dto.decimales !== undefined) {
      const d = Number(dto.decimales);
      data.decimales = Number.isFinite(d) && d >= 0 && d <= 3 ? Math.floor(d) : 0;
    }
    if (dto.langue !== undefined) data.langue = dto.langue === 'en' ? 'en' : 'fr';
    if (dto.locale !== undefined) data.locale = String(dto.locale).trim();

    await this.prisma.configRegion.upsert({
      where: { id: 'region' },
      update: data,
      create: { id: 'region', ...data },
    });
    return this.getConfig();
  }
}
