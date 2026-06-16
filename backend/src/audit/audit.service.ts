import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(userId: string, action: string, module: string, ip: string) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action,
        module,
        ip: ip || 'unknown',
      },
    });
  }
}
