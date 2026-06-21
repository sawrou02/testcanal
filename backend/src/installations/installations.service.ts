import { Injectable } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

export class CreateInstallationDto {
  @IsString()
  pdvId: string;

  @IsString()
  clientNom: string;

  @IsString()
  technicien: string;
}

export class UpdateInstallationDto {
  @IsOptional()
  @IsString()
  statut?: string; // DEMANDEE | INSTALLEE | ANNULEE

  @IsOptional()
  @IsString()
  technicien?: string;
}

@Injectable()
export class InstallationsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  findAll() {
    return this.prisma.installation.findMany({
      include: { pdv: { select: { raisonSociale: true } } },
      orderBy: { dateDemande: 'desc' },
    });
  }

  async stats() {
    const [demandees, installees, total] = await Promise.all([
      this.prisma.installation.count({ where: { statut: 'DEMANDEE' } }),
      this.prisma.installation.count({ where: { statut: 'INSTALLEE' } }),
      this.prisma.installation.count(),
    ]);
    const taux = total > 0 ? Math.round((installees / total) * 1000) / 10 : 0;
    return { demandees, installees, total, taux };
  }

  create(dto: CreateInstallationDto) {
    return this.prisma.installation.create({ data: dto });
  }

  async update(id: string, dto: UpdateInstallationDto, userId: string, ip: string) {
    const data: any = { ...dto };
    if (dto.statut === 'INSTALLEE') data.dateInstallation = new Date();
    const updated = await this.prisma.installation.update({ where: { id }, data });
    await this.audit.log(userId, 'MAJ_INSTALLATION', 'OPERATIONS', ip);
    return updated;
  }

  remove(id: string) {
    return this.prisma.installation.delete({ where: { id } });
  }
}
