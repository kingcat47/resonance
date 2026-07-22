import { Module } from '@nestjs/common';
import { OprfController } from './oprf.controller';
import { OprfService } from './oprf.service';

@Module({
  controllers: [OprfController],
  providers: [OprfService],
})
export class OprfModule {}
