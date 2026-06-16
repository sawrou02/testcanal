import { Module } from '@nestjs/common';
import { OperationsBancairesController } from './operations-bancaires.controller';
import { OperationsBancairesService } from './operations-bancaires.service';

@Module({
  controllers: [OperationsBancairesController],
  providers: [OperationsBancairesService],
})
export class OperationsBancairesModule {}
