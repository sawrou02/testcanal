import { Module } from '@nestjs/common';
import { RetourRpeController } from './retour-rpe.controller';
import { RetourRpeService } from './retour-rpe.service';
@Module({ controllers: [RetourRpeController], providers: [RetourRpeService] })
export class RetourRpeModule {}
