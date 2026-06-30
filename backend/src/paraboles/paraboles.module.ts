import { Module } from '@nestjs/common';
import { ParabolesController } from './paraboles.controller';
import { ParabolesService } from './paraboles.service';

@Module({
  controllers: [ParabolesController],
  providers: [ParabolesService],
})
export class ParabolesModule {}
