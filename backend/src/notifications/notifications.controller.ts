import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private svc: NotificationsService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Patch('read-all')
  markAllRead() {
    return this.svc.markAllRead();
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string) {
    return this.svc.markRead(id);
  }

  @Patch(':id/dismiss')
  dismiss(@Param('id') id: string) {
    return this.svc.dismiss(id);
  }
}
