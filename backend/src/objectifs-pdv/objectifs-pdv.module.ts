import { Module } from '@nestjs/common';
import { ObjectifsPdvController } from './objectifs-pdv.controller';
import { ObjectifsPdvService } from './objectifs-pdv.service';

@Module({
  controllers: [ObjectifsPdvController],
  providers: [ObjectifsPdvService],
})
export class ObjectifsPdvModule {}
