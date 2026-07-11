import { Global, Module } from '@nestjs/common';
import { RegionService } from './region.service';
import { RegionController } from './region.controller';

@Global()
@Module({
  providers: [RegionService],
  controllers: [RegionController],
  exports: [RegionService],
})
export class RegionModule {}
