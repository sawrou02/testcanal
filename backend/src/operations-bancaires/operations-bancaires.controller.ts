import { Controller, Get, UseGuards } from '@nestjs/common';
import { OperationsBancairesService } from './operations-bancaires.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('operations-bancaires')
@UseGuards(JwtAuthGuard)
export class OperationsBancairesController {
  constructor(
    private operationsBancairesService: OperationsBancairesService,
  ) {}

  @Get()
  async findAll() {
    return this.operationsBancairesService.findAll();
  }
}
