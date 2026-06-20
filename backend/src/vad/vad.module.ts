import { Module } from '@nestjs/common';
import { VadController } from './vad.controller';
import { VadService } from './vad.service';

@Module({
  controllers: [VadController],
  providers: [VadService],
})
export class VadModule {}
