import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { OprfModule } from './oprf/oprf.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [PrismaModule, ReportsModule, AdminModule, OprfModule],
})
export class AppModule {}
