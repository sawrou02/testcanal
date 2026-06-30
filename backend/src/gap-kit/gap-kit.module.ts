import { Module } from '@nestjs/common';
import { GapKitController } from './gap-kit.controller';
import { GapKitService } from './gap-kit.service';

@Module({
  controllers: [GapKitController],
  providers: [GapKitService],
})
export class GapKitModule {}
