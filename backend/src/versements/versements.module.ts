import { Module } from '@nestjs/common';
import { VersementsController } from './versements.controller';
import { VersementsService } from './versements.service';

@Module({
  controllers: [VersementsController],
  providers: [VersementsService],
})
export class VersementsModule {}
