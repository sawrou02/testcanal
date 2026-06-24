import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { BaremesModule } from '../baremes/baremes.module';

@Module({
  imports: [BaremesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
