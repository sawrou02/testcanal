import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SchemaGuardService } from './schema-guard.service';

@Global()
@Module({
  providers: [PrismaService, SchemaGuardService],
  exports: [PrismaService],
})
export class PrismaModule {}
