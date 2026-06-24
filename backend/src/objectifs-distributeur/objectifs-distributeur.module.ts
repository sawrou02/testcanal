import { Module } from '@nestjs/common';
import { ObjectifsDistributeurController } from './objectifs-distributeur.controller';
import { ObjectifsDistributeurService } from './objectifs-distributeur.service';

@Module({
  controllers: [ObjectifsDistributeurController],
  providers: [ObjectifsDistributeurService],
})
export class ObjectifsDistributeurModule {}
