import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async list() {
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { dismissed: false },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.notification.count({ where: { lu: false, dismissed: false } }),
    ]);
    return { items, unread };
  }

  markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { lu: true } });
  }

  dismiss(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { dismissed: true } });
  }

  async markAllRead() {
    await this.prisma.notification.updateMany({ where: { lu: false }, data: { lu: true } });
    return { ok: true };
  }
}
