import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { MasterDataModule } from './modules/master-data/master-data.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { ApprovalManagementModule } from './modules/approval-management/approval-management.module';
import { HealthController } from './health.controller';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    // RedisModule,
    DatabaseModule,
    MasterDataModule,
    AttendanceModule,
    ApprovalManagementModule,
  ],
  providers: [
    // Logger,
    HealthController,
  ],
})
export class AppModule { }
